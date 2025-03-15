package com.example.photomap
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.res.Resources
import android.location.Geocoder
import android.net.Uri
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.VisibleForTesting
import androidx.core.text.HtmlCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.photomap.BuildConfig.MAPS_API_KEY
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.example.photomap.databinding.ActivityMapsBinding
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.time.Instant
import java.util.Locale

import com.example.photomap.MainActivity.mapContent
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.selects.select

class MapsActivity : AppCompatActivity(), OnMapReadyCallback {

    // Constants
    private val MAX_REC_PLACES: Int = 20
    private val TAG: String = "MapsActivity"
    private val PLACE_SEARCH_RADIUS: Int = 10000
    private var addMarkerDialog: AlertDialog? = null

    private val addedPlaces = mutableListOf<Place>()

    private lateinit var USER_EMAIL: String
    private lateinit var mMap: GoogleMap
    private lateinit var binding: ActivityMapsBinding
    private lateinit var fabActions: FloatingActionButton
    private lateinit var fabDeleteMarker: FloatingActionButton
    private lateinit var galleryContainer: FrameLayout
    private lateinit var noImagesText: TextView
    private lateinit var imageGalleryRecycler: RecyclerView

    internal var selectedImageUri: Uri? = null
    private var previewImageView: ImageView? = null
    private var currentMarker: MarkerInstance? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMapsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Gallery display container
        galleryContainer = findViewById(R.id.galleryContainer)
        noImagesText = findViewById(R.id.noImagesText)
        imageGalleryRecycler = findViewById(R.id.imageGalleryRecycler)

        // Set up horizontal layout manager
        imageGalleryRecycler.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)

        fabActions = findViewById(R.id.fab_actions)
        fabActions.visibility = View.GONE

        fabDeleteMarker = findViewById(R.id.deleteMarker)
        fabDeleteMarker.visibility = View.GONE

        // Recommendation button
        val fabRecommendation: FloatingActionButton = findViewById(R.id.recommendation)
        fabRecommendation.visibility = View.VISIBLE
        fabRecommendation.setOnClickListener {
            Toast.makeText(this, "Recommendation clicked!", Toast.LENGTH_SHORT).show()
            fetchRecommendation()
        }

        // Album Button
        val fabAlbum: FloatingActionButton = findViewById(R.id.album)
        fabAlbum.visibility = View.VISIBLE
        fabAlbum.setOnClickListener {
            Toast.makeText(this, "Album clicked!", Toast.LENGTH_SHORT).show()
            val intent = Intent(this, GalleryActivity::class.java)
            startActivity(intent)
        }

        // Obtain the SupportMapFragment and get notified when the map is ready to be used.
        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    private fun fetchRecommendation() {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.getPopularLocations(USER_EMAIL)

                if (response.isSuccessful && response.body() != null) {
                    val popularLocation = response.body()!!.popularLocation

                    if (popularLocation == null) {
                        //Display custom backend message for no recommendation
                        Toast.makeText(this@MapsActivity, "No recommendation available: Did you add enough markers and photos?", Toast.LENGTH_LONG).show()
                        Log.e("MapsActivity", "No recommendation available: insufficient images or markers. ")

                    } else {
                        val lat = popularLocation.position.lat
                        val lng = popularLocation.position.lng
                        val tags = popularLocation.tags

                        Toast.makeText(this@MapsActivity, "Got recommendation", Toast.LENGTH_SHORT).show()
                        Log.d("MapsActivity", "Got recommendation at ($lat, $lng), with tags: $tags")

                        fetchNearbyPlaces("$lat,$lng", lat, lng, tags)
                    }
                } else {
                    val errorMsg = response.errorBody()?.string()
                    Toast.makeText(this@MapsActivity, "Recommendation failed, no places found match. ", Toast.LENGTH_LONG).show()
                    Log.e("MapsActivity", "Receive recommendation failed: $errorMsg")

                }
            } catch (e: Exception) {
                // Handle the error
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Failed to fetch recommendation.", Toast.LENGTH_SHORT).show()
            }
        }
    }


    // Uses Places API to get nearby places
    private fun fetchNearbyPlaces(coordinate: String, lat: Double, lng: Double, tags: List<String>) {
        lifecycleScope.launch {

            val finalPlacesList = mutableListOf<Place>()

            // Launch async calls for the top 3 tags concurrently
            val deferredResults = tags.map { tag ->
                async {  // Specify that this async returns a List<Place>
                    try {
                        val response = RetrofitPlacesClient.api.nearbySearch(
                            location = coordinate,
                            radius = PLACE_SEARCH_RADIUS, // adjust as needed
                            keyword = tag,
                            apiKey = MAPS_API_KEY
                        )
                        Log.d("MapsActivity", "Tag used: $tag")
                        if (response.isSuccessful) {
                            response.body()!!.results // Ensure this is a List<Place>
                        } else {
                            Log.e("MapsActivity", "Zero response found??")
                            emptyList()
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                        emptyList()
                    }
                }
            }

            // Await all results and combine them into the final list
            deferredResults.awaitAll().forEach { results ->
                finalPlacesList.addAll(results)
            }

            // Optionally, deduplicate results based on a unique property such as place id
            var uniquePlaces = finalPlacesList.distinctBy { it.placeId }.take(MAX_REC_PLACES)

            uniquePlaces = uniquePlaces.filterNot { place -> addedPlaces.any { it.placeId == place.placeId } }

            Log.d("MapsActivity", "Final places list size: ${uniquePlaces.size}")

            showRecommendationBottomSheet(lat, lng, tags, uniquePlaces)
        }
    }

    private fun showRecommendationBottomSheet(lat: Double, lng: Double, tags: List<String>, places: List<Place>) {
        val bottomSheetDialog = BottomSheetDialog(this)
        val view = layoutInflater.inflate(R.layout.bottom_sheet_recommendation, null)
        bottomSheetDialog.setContentView(view)

        // Get references to UI elements in the BottomSheet
        val tvSummary = view.findViewById<TextView>(R.id.tvSummary)
        val rvSuggestedPlaces = view.findViewById<RecyclerView>(R.id.rvSuggestedPlaces)
        val tvNoPlacesMessage = view.findViewById<TextView>(R.id.tvNoPlacesMessage)

        // Construct a summary string with the recommendation details
        val tagsString = if (tags.isNotEmpty()) tags.joinToString(", ") else "No tags available"
        val cityName = getCityName(this, lat, lng)
        val summaryText = HtmlCompat.fromHtml(
            "<b>You appear to be most active around:</b><br> $cityName <br><br>" +
                    "<b>Your uploaded photos commonly feature these objects or themes:</b><br> $tagsString <br><br>" +
                    "Here is a list of locations matching your photo themes that might pique your interest!",
            HtmlCompat.FROM_HTML_MODE_LEGACY
        )
        tvSummary.text = summaryText

        // Configure the RecyclerView based on whether there are suggested places
        if (places.isEmpty()) {
            tvNoPlacesMessage.visibility = View.VISIBLE
            rvSuggestedPlaces.visibility = View.GONE
        } else {
            tvNoPlacesMessage.visibility = View.GONE
            rvSuggestedPlaces.visibility = View.VISIBLE
            // Set up the adapter for the list of places
            val adapter = PlaceAdapter(this, places, { selectedPlace ->
                addRecommendationMarkerOnMap(selectedPlace)
                bottomSheetDialog.dismiss() // Close BottomSheet
            })
            rvSuggestedPlaces.layoutManager = LinearLayoutManager(this)
            rvSuggestedPlaces.adapter = adapter
        }

        // Finally, show the BottomSheet
        bottomSheetDialog.show()
    }

    private fun addRecommendationMarkerOnMap(selectedPlace: Place) {

        val lat = selectedPlace.geometry.location.lat
        val lng = selectedPlace.geometry.location.lng

        if (mapContent.markerList.any { it.lat == lat && it.lng == lng }) {
            Log.d(TAG, "Marker already exists at this location, skipping duplicate.")
            return
        }

        val markerTitle = "Popular - " + selectedPlace.name
        val selectedColor = "azure"
        val cityName = getCityName(this, lat, lng)

        // Store the marker data
        currentMarker = MarkerInstance(
            lat = lat,
            lng = lng,
            title = markerTitle,
            color = selectedColor,
            location = cityName,
            photoAtCurrentMarker = arrayListOf()
        )

        sendMarkerUpdate(USER_EMAIL, currentMarker!!){
            Snackbar.make(
                findViewById(android.R.id.content), // Or a specific CoordinatorLayout
                "Add Marker Successful!",
                Snackbar.LENGTH_SHORT
            ).show()
            addedPlaces.add(selectedPlace)
        }
    }

    /**
     * Manipulates the map once available.
     * This callback is triggered when the map is ready to be used.
     * This is where we can add markers or lines, add listeners or move the camera. In this case,
     * we just add a marker near Sydney, Australia.
     * If Google Play services is not installed on the device, the user will be prompted to install
     * it inside the SupportMapFragment. This method will only be triggered once the user has
     * installed Google Play services and returned to the app.
     */
    override fun onMapReady(googleMap: GoogleMap) {

        // Init global fields
        mMap = googleMap
        USER_EMAIL = getSharedPreferences("UserPrefs", MODE_PRIVATE).getString("user_email", null) ?: "anonymous@example.com"
        Log.d(TAG, "User email fetched on map creation: $USER_EMAIL")

        // Load the style from the raw resource folder
        try {
            val success = mMap.setMapStyle(
                MapStyleOptions.loadRawResourceStyle(this, R.raw.map_style)
            )
            if (!success) {
                Log.e("MapsActivity", "Style parsing failed.")
            }
        } catch (e: Resources.NotFoundException) {
            Log.e("MapsActivity", "Can't find style. Error: ", e)
        }

        Log.d("MapsActivity", "Begin loading map.")

        // Load all markers fetched from backend
        for (marker in mapContent.markerList) {
            val position = LatLng(marker.lat, marker.lng)
            //Log.d("MapsActivity", "Adding marker: $marker")
            val drawnMarker = mMap.addMarker(
                MarkerOptions()
                    .position(position)
                    .title(marker.title)
                    .icon(BitmapDescriptorFactory.defaultMarker(getHueFromColor(marker.color)))
            )

            //Remember when first creating the marker, add tag to color and ref to google marker.
            drawnMarker?.tag = marker.color
            marker.drawnMarker = drawnMarker
        }

        // Optionally, adjust the camera to the first marker
        mapContent.markerList.firstOrNull()?.let {
            val position = LatLng(it.lat, it.lng)
            Log.d("MapsActivity", "Moving camera to: $position")
            mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(position, 15f))
        }

        // Draw markers onto the map
        mMap.setOnMapClickListener { latLng ->
            // Inflate the custom dialog layout
            val dialogView = layoutInflater.inflate(R.layout.marker_style, null)
            val titleEditText = dialogView.findViewById<EditText>(R.id.markerTitle)
            val colorSpinner = dialogView.findViewById<Spinner>(R.id.colorSpinner)

            // Set up the Spinner with color options
            ArrayAdapter.createFromResource(
                this,
                R.array.marker_colors,
                android.R.layout.simple_spinner_item
            ).also { adapter ->
                adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                colorSpinner.adapter = adapter
            }

            // Views: Upload off, Gallery Off
            fabActions.visibility = View.GONE
            fabDeleteMarker.visibility = View.GONE
            hideGallery()

            // Build and display the AlertDialog
            addMarkerDialog = AlertDialog.Builder(this)
                .setTitle("Add Marker")
                .setView(dialogView)
                .setPositiveButton("Add") { _, _ ->
                    val markerTitle = if (titleEditText.text.toString().isBlank()) "NoName Marker" else titleEditText.text.toString()
                    val selectedColor = colorSpinner.selectedItem.toString()
                    val lat = latLng.latitude
                    val lng = latLng.longitude
                    val cityName = getCityName(this, lat, lng)
                    // Store the marker data
                    currentMarker = MarkerInstance(
                        lat = lat,
                        lng = lng,
                        title = markerTitle,
                        color = selectedColor,
                        location = cityName,
                        photoAtCurrentMarker = arrayListOf(),
                    )

                    sendMarkerUpdate(USER_EMAIL, currentMarker!!){
                        Snackbar.make(
                            findViewById(android.R.id.content), // Or a specific CoordinatorLayout
                            "Add Marker Successful!",
                            Snackbar.LENGTH_SHORT
                        ).show()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        // Set marker click listener
        mMap.setOnMarkerClickListener { marker ->
            val lat = marker.position.latitude
            val lng = marker.position.longitude
            val markerTitle = marker.title ?: "Untitled Marker"
            val markerColor = marker.tag ?: "unknown Color"

            // Obtain location string
            val cityName = getCityName(this, lat, lng)
            // 3) Store the marker data
            currentMarker = MarkerInstance(
                lat = lat,
                lng = lng,
                title = markerTitle,
                color = markerColor.toString(),
                location = cityName,
                photoAtCurrentMarker = arrayListOf()
            )
            Log.d("MapsActivity", "current Marker data before match: $currentMarker")

            val matchedMarker = mapContent.markerList.firstOrNull { it.title == currentMarker!!.title && it.lat == currentMarker!!.lat && it.lng == currentMarker!!.lng}
            currentMarker = matchedMarker

            Log.d("MapsActivity", "current Marker data after match: $currentMarker")

            matchedMarker?.let { markerInstance ->
                val photos = markerInstance.photoAtCurrentMarker
                showGallery(photos)
            } ?: run {
                hideGallery()
            }

            fabActions.visibility = View.VISIBLE
            fabDeleteMarker.visibility = View.VISIBLE
            false  // Return false to allow default behavior (e.g., info window display)
        }

        fabActions.setOnClickListener {
            showUploadBottomSheet()
        }

        fabDeleteMarker.setOnClickListener {

            val builder = AlertDialog.Builder(this)
            builder.setTitle("Warning")
            builder.setMessage("If you delete this marker, all images tagged to this marker will also be deleted. Do you wish to proceed?")
            // Set the positive button action: user confirms deletion
            builder.setPositiveButton("Yes") { _, _ ->
                deleteMarker()  // Execute the deletion function
                Toast.makeText(this, "Marker deleted", Toast.LENGTH_SHORT).show()
                Log.d("MapsActivity", "Alert dialog confirm: marker deleted.")
            }

            // Set the negative button action: user cancels deletion
            builder.setNegativeButton("Cancel") { dialog, _ ->
                dialog.dismiss()  // Simply dismiss the dialog
                Toast.makeText(this, "Deletion cancelled", Toast.LENGTH_SHORT).show()
            }

            // Build and show the dialog
            val alertDialog = builder.create()
            alertDialog.show()
        }
    }

    private fun deleteMarker() {
        lifecycleScope.launch {
            try {
                // Build the location JSON and convert it to RequestBody
                val locationJson = JSONObject().apply {
                    put("location", JSONObject().apply {
                        put("position", JSONObject().apply {
                            put("lat", currentMarker?.lat)
                            put("lng", currentMarker?.lng)
                        })
                        put("title", currentMarker?.title)
                        put("location", currentMarker?.location)
                        put("icon", currentMarker?.color)
                    })
                }.toString()

                Log.d("MapsActivity", "currLat: ${currentMarker?.lat}, currLng: ${currentMarker?.lng}, currTitle: ${currentMarker?.title}, currColor: ${currentMarker?.color}")
                val locationBody = locationJson.toRequestBody("application/json".toMediaTypeOrNull())

                // Retrieve user email from SharedPreferences
                val userEmail = USER_EMAIL
                Log.d("MapsActivity", "User email: $userEmail")

                val response = RetrofitClient.api.deleteMarker(userEmail, locationBody)
                if (response.isSuccessful) {
                    Log.d("MapsActivity", "Marker delete successful from DB. Now deleting images.")
                    Log.d("MapsActivity", "Photos at current marker before: ${currentMarker?.photoAtCurrentMarker}")


                    currentMarker?.photoAtCurrentMarker?.let { photos ->
                        // Delete each photo in the list
                        for (photo in photos) {
                            try {
                                deleteImage(photo.fileName)
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        }
                        // Clear the list after all deletions
                        photos.clear()
                    }

                    Log.d("MapsActivity", "Photos at current marker after: ${currentMarker?.photoAtCurrentMarker}")

                    currentMarker?.drawnMarker?.remove() // Remove the marker from the map

                    Log.d("MapsActivity", "Marker list before: ${mapContent.markerList}")
                    mapContent.markerList.remove(currentMarker)
                    hideGallery()
                    Log.d("MapsActivity", "Marker list after: ${mapContent.markerList}")
                    Toast.makeText(this@MapsActivity, "Marker deleted successfully", Toast.LENGTH_SHORT).show()
                } else {
                    // Handle error response
                    val errorMsg = response.errorBody()?.string()
                    Log.e("MapsActivity", "Failed to delete marker: $errorMsg")
                    Toast.makeText(this@MapsActivity, "Failed to delete marker: $errorMsg", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun deleteImage(fileName: String) {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.deleteImage(fileName)
                if (response.isSuccessful) {
                    Log.d("MapsActivity", "Image $fileName deleted successfully")
                } else {
                    // Handle error response
                    val errorMsg = response.errorBody()?.string()
                    Log.e("MapsActivity", "Failed to delete image: $fileName, Error: $errorMsg")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }


    private fun showGallery(imageUrls: List<PhotoInstance>) {
        if (imageUrls.isEmpty()) {
            // No images to display
            imageGalleryRecycler.visibility = View.GONE
            noImagesText.visibility = View.VISIBLE
        } else {
            // Display images in RecyclerView
            imageGalleryRecycler.visibility = View.VISIBLE
            noImagesText.visibility = View.GONE
            val urlList = imageUrls.map { it.imageURL }
            imageGalleryRecycler.adapter = GalleryAdapter(urlList)
        }
        // Make container visible
        galleryContainer.visibility = View.VISIBLE
    }

    private fun hideGallery() {
        galleryContainer.visibility = View.GONE
    }

    // Upload photos
    private fun showUploadBottomSheet() {
        val bottomSheetDialog = BottomSheetDialog(this)
        val view = layoutInflater.inflate(R.layout.bottom_sheet_upload, null)
        bottomSheetDialog.setContentView(view)

        val pickPhotoButton = view.findViewById<Button>(R.id.btn_pick_photo)
        val submitButton = view.findViewById<Button>(R.id.btn_submit_upload)
        val previewImageView = view.findViewById<ImageView>(R.id.imagePreview)
        this.previewImageView = previewImageView


        pickPhotoButton.setOnClickListener {
            pickImageLauncherTest.launch("image/*")
        }

        submitButton.setOnClickListener {
            if (selectedImageUri == null) {
                Log.d("MapsActivity", "No image selected.")
                Snackbar.make(
                    findViewById(android.R.id.content), // Or a specific CoordinatorLayout
                    "No image selected.",
                    Snackbar.LENGTH_SHORT
                ).show()
                bottomSheetDialog.dismiss()
            }

            if (currentMarker == null) {
                Toast.makeText(this, "No marker selected!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            Toast.makeText(this, "Submit button clicked", Toast.LENGTH_SHORT).show()
            uploadPhotoToAWS()
            bottomSheetDialog.dismiss()
        }

        bottomSheetDialog.show()
    }

    private val pickImageLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
            selectedImageUri = uri
            // Show the preview in your ImageView
            previewImageView?.visibility = View.VISIBLE
            previewImageView?.setImageURI(uri)
    }

    var pickImageLauncherTest : ActivityResultLauncher<String> = pickImageLauncher


    private fun uploadPhotoToAWS() {
        lifecycleScope.launch {
            try {
                val imagePart = createImagePart(selectedImageUri!!)
                val description = "This is a test description"
                val descriptionBody = description.toRequestBody("text/plain".toMediaTypeOrNull())

                val locationJson = JSONObject().apply {
                    put("position", JSONObject().apply {
                        put("lat", currentMarker?.lat ?: 0.0)
                        put("lng", currentMarker?.lng ?: 0.0)
                    })
                    put("title", currentMarker?.title ?: "Untitled")
                    put("location", currentMarker?.location ?: "Unknown")
                    put("icon", currentMarker?.color ?: "red")
                }.toString()
                val locationBody = locationJson.toRequestBody("application/json".toMediaTypeOrNull())
                val userEmailReqBody = (USER_EMAIL).toRequestBody("text/plain".toMediaTypeOrNull())
                val sharedToBody = "[]".toRequestBody("application/json".toMediaTypeOrNull())
                val sharedBody = "false".toRequestBody("text/plain".toMediaTypeOrNull())
                val sharedByBody = "".toRequestBody("text/plain".toMediaTypeOrNull())


                val response = RetrofitClient.api.uploadPhoto(
                    image = imagePart,
                    description = descriptionBody,
                    uploader = userEmailReqBody,
                    location = locationBody,
                    sharedTo = sharedToBody,
                    shared = sharedBody,
                    sharedBy = sharedByBody
                )

                if (response.isSuccessful) {
                    // Show success
                    //Toast.makeText(this@MapsActivity, "Upload successful!", Toast.LENGTH_SHORT).show()
                    Snackbar.make(
                        findViewById(android.R.id.content), // Or a specific CoordinatorLayout
                        "Upload Successful!",
                        Snackbar.LENGTH_SHORT
                    ).show()
                    val uploadData = response.body()

                    Log.d("MapsActivity", "Upload filename: ${uploadData?.fileName}")

                    //val matchedMarker = mapContent.markerList.firstOrNull { it.title == currentMarker!!.title }
                    currentMarker?.photoAtCurrentMarker?.add(PhotoInstance(
                        imageURL = uploadData?.presignedUrl?: "no url available.",
                        time = Instant.now(),
                        fileName = uploadData?.fileName?: "no file name available.",
                        sharedTo = mutableListOf(),
                        shared = false,
                        sharedBy = null
                    ))

                    //refresh, update view
                    currentMarker?.let { markerInstance ->
                        val photos = markerInstance.photoAtCurrentMarker
                        showGallery(photos)
                    } ?: run {
                        hideGallery()
                    }

                    Log.d("MapsActivity", "Upload response: $uploadData")

                } else {
                    // Show error
                    val errorMsg = response.errorBody()?.string()
                    Toast.makeText(this@MapsActivity, "Upload failed: $errorMsg", Toast.LENGTH_LONG).show()
                    Log.e("MapsActivity", "Upload failed: $errorMsg")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                Log.e("MapsActivity", "Error uploading photo", e)
            }
        }
    }

    private fun createImagePart(uri: Uri): MultipartBody.Part {
        val inputStream = contentResolver.openInputStream(uri) ?: throw IllegalStateException("Unable to open image")

        val fileBytes = inputStream.readBytes()
        inputStream.close()

        // Create RequestBody for the image
        val requestFile = fileBytes.toRequestBody("image/*".toMediaTypeOrNull())

        // Wrap it in MultipartBody.Part with form field name "image"
        return MultipartBody.Part.createFormData(
            "image",
            "filename",
            requestFile
        )
    }

    // Helper function to map color names to hue values
    private fun getHueFromColor(color: String): Float {
        return when (color.lowercase()) {
            "red" -> BitmapDescriptorFactory.HUE_RED
            "blue" -> BitmapDescriptorFactory.HUE_BLUE
            "green" -> BitmapDescriptorFactory.HUE_GREEN
            "yellow" -> BitmapDescriptorFactory.HUE_YELLOW
            "orange" -> BitmapDescriptorFactory.HUE_ORANGE
            "violet" -> BitmapDescriptorFactory.HUE_VIOLET
            "azure" -> BitmapDescriptorFactory.HUE_AZURE
            else -> BitmapDescriptorFactory.HUE_RED  // Default color if none match
        }
    }

    private fun getCityName(context: Context, lat: Double, lng: Double): String {
        val geocoder = Geocoder(context, Locale.getDefault())
        return try {
            val addresses = geocoder.getFromLocation(lat, lng, 1)
            addresses?.firstOrNull()?.locality ?: "Unknown"
        } catch (e: IOException) {
            e.printStackTrace()
            "Unknown"
        }
    }

    // Send newly create marker to server
    private fun sendMarkerUpdate(email: String, markerData: MarkerInstance,  onSuccess: (() -> Unit)? = null) {
        lifecycleScope.launch {
            try {
                val locationJson = JSONObject().apply {
                        put("location", JSONObject().apply {
                            put("position", JSONObject().apply {
                                put("lat", markerData.lat)
                                put("lng", markerData.lng)
                            })
                            put("title", markerData.title)
                            put("location", markerData.location)
                            put("icon", markerData.color)
                        })
                    }.toString()

                Log.d("MapsActivity", "Marker update JSON: $locationJson")

                // Convert to Json Request Body
                val locationBody = locationJson.toRequestBody("application/json".toMediaTypeOrNull())

                val response = RetrofitClient.api.putLocation(email, locationBody)

                if (response.isSuccessful) {
                    val responseBody = response.body()
                    val message = responseBody?.message ?: "No message"
                    val addedLocation = responseBody?.addedLocation
                    val latlng = LatLng(markerData.lat, markerData.lng)
                    val hue = getHueFromColor(markerData.color)

                    Log.d("MapsActivity", "Marker update response: $message")
                    addedLocation?.let {
                        Log.d("MapsActivity", "Triggered here")
                        Log.d("MapsActivity", "Added Location: ${it.title}, ${it.position.lat}, ${it.position.lng}")
                        // Update UI or map marker here
                    }
                    // Marker attributes: push this information to DB
                    val marker = mMap.addMarker(
                        MarkerOptions()
                            .position(latlng)
                            .title(markerData.title)
                            .icon(BitmapDescriptorFactory.defaultMarker(hue))
                    )

                    // Tag marker color for map use
                    marker?.tag = markerData.color
                    currentMarker!!.drawnMarker = marker
                    Log.d("MapsActivity", "After save to db, current marker data: $currentMarker")
                    // On success, add the markers
                    mapContent.markerList.add(currentMarker!!)
                    mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(latlng, 15f))

                    // Trigger Callback for Frontend Success Display.
                    onSuccess?.invoke()
                } else {
                    Toast.makeText(this@MapsActivity, "Error: Marker save to backend failed.", Toast.LENGTH_LONG).show()
                    Log.e("MapsActivity", "Failed to update marker: ${response.errorBody()?.string()}")
                }

            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Error: Network error, check internet.", Toast.LENGTH_LONG).show()
                Log.e("MapsActivity", "Network request failed.", e)
            }
        }
    }

    override fun onDestroy() {
        addMarkerDialog?.dismiss()
        addMarkerDialog = null
        super.onDestroy()
    }

}
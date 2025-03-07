package com.example.photomap

import android.app.AlertDialog
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
import androidx.activity.result.contract.ActivityResultContracts
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

class MapsActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var mMap: GoogleMap
    private lateinit var binding: ActivityMapsBinding
    private lateinit var fabActions: FloatingActionButton
    private lateinit var galleryContainer: FrameLayout
    private lateinit var noImagesText: TextView
    private lateinit var imageGalleryRecycler: RecyclerView


    private var selectedImageUri: Uri? = null
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
                // Make the network request on the IO thread

                val prefs = getSharedPreferences("UserPrefs", MODE_PRIVATE)
                val email = prefs.getString("user_email", null) ?: "anonymous@example.com"



                val response = RetrofitClient.api.getPopularLocations(email)

                if (response.isSuccessful && response.body() != null) {
                    val popularLocation = response.body()!!.popularLocation

                    if (popularLocation == null) {
                        //Display custom backend message for no recommendation
                        Toast.makeText(this@MapsActivity, "No recommendation available: Did you upload enough photos?.", Toast.LENGTH_LONG).show()
                        Log.e("MapsActivity", "No recommendation available: insufficient images or bad location")

                    } else {
                        val lat = popularLocation.position.lat
                        val lng = popularLocation.position.lng
                        val tags = popularLocation.tags

                        Toast.makeText(this@MapsActivity, "Got recommendation", Toast.LENGTH_SHORT).show()
                        Log.d("MapsActivity", "Got recommendation at ($lat, $lng), with tags: $tags")

                        //Call Places API to get recommendation
                        val keywordQuery = tags.firstOrNull() ?: ""
                        fetchNearbyPlaces("$lat,$lng", keywordQuery)
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
    private fun fetchNearbyPlaces(coordinate: String, keyword: String) {
        lifecycleScope.launch {
            try {
                val response = RetrofitPlacesClient.api.nearbySearch(
                    location = coordinate,
                    radius = 1500, // can adjust
                    keyword = keyword,
                    apiKey = MAPS_API_KEY
                )
                if (response.status == "OK") {
                    // Choose top tag
                    val bestPlace = response.results.firstOrNull()
                    bestPlace?.let {
                        val lat = it.geometry.location.lat
                        val lng = it.geometry.location.lng
                        // Add a marker on the map at these coordinates
                        mMap.addMarker(MarkerOptions().
                            position(LatLng(lat, lng)).
                            title(it.name).
                            icon(BitmapDescriptorFactory.defaultMarker(getHueFromColor("violet"))))

                        // Move the camera to the new location
                        mMap.moveCamera(
                            CameraUpdateFactory.newLatLngZoom(
                                LatLng(lat, lng),
                                15f
                            )
                        )
                    }

                    Log.d("MapsActivity", "Nearby places added on map.")
                } else {
                    // Handle API error (e.g., OVER_QUERY_LIMIT, REQUEST_DENIED, etc.)
                    Log.e("MapsActivity", "Error: ${response.status}")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                Log.e("MapsActivity", "Network request failed.", e)
            }
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
        mMap = googleMap

        // Load the style from the raw resource folder
        try {

            // Styling for map display
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
            Log.d("MapsActivity", "Adding marker: $marker")
            mMap.addMarker(
                MarkerOptions()
                    .position(position)
                    .title(marker.title)
                    .icon(BitmapDescriptorFactory.defaultMarker(getHueFromColor(marker.color)))
            )
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
            hideGallery()

            // Build and display the AlertDialog
            AlertDialog.Builder(this)
                .setTitle("Add Marker")
                .setView(dialogView)
                .setPositiveButton("Add") { _, _ ->
                    val markerTitle = titleEditText.text.toString()
                    val selectedColor = colorSpinner.selectedItem.toString()
                    val hue = getHueFromColor(selectedColor)

                    // Marker attributes: push this information to DB
                    val marker = mMap.addMarker(
                            MarkerOptions()
                            .position(latLng)
                            .title(markerTitle)
                            .icon(BitmapDescriptorFactory.defaultMarker(hue))
                    )

                    // Tag marker color for map use
                    marker?.tag = selectedColor

                    val lat = latLng.latitude
                    val lng = latLng.longitude

                    // Obtain location string
                    val geocoder = Geocoder(this, Locale.getDefault())
                    var cityName = "Unknown"
                    try {
                        val addresses = geocoder.getFromLocation(lat, lng, 1)
                        if (!addresses.isNullOrEmpty()) {
                            cityName = addresses[0].locality ?: "Unknown"
                        }
                    } catch (e: IOException) {
                        e.printStackTrace()
                    }

                    // Store the marker data
                    currentMarker = MarkerInstance(
                        lat = lat,
                        lng = lng,
                        title = markerTitle,
                        color = selectedColor,
                        location = cityName,
                        photoAtCurrentMarker = arrayListOf()
                    )

                    sendMarkerUpdate(getSharedPreferences("UserPrefs", MODE_PRIVATE).getString("user_email", "")?: "anonymous@example.com", currentMarker!!)
                    mapContent.markerList.add(currentMarker!!)


                    Log.d("MapsActivity", "Marker data: $currentMarker")
                    for(i in 0 until mapContent.markerList.size){
                        Log.d("MapsActivity", "Marker data in list: ${mapContent.markerList[i]}")
                    }
                    //Log.d("MapsActivity", mapContent.markerList.toString())

                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        // Set marker click listener
        mMap.setOnMarkerClickListener { marker ->
            val lat = marker.position.latitude
            val lng = marker.position.longitude
            val markerTitle = marker.title ?: "Untitled Marker"
            val markerColor = marker.tag ?: "red"

            // Obtain location string
            val geocoder = Geocoder(this, Locale.getDefault())
            var cityName = "Unknown"
            try {
                val addresses = geocoder.getFromLocation(lat, lng, 1)
                if (!addresses.isNullOrEmpty()) {
                    cityName = addresses[0].locality ?: "Unknown"
                }
            } catch (e: IOException) {
                e.printStackTrace()
            }

            // 3) Store the marker data
            currentMarker = MarkerInstance(
                lat = lat,
                lng = lng,
                title = markerTitle,
                color = markerColor.toString(),
                location = cityName,
                photoAtCurrentMarker = arrayListOf()
            )

            val matchedMarker = mapContent.markerList.firstOrNull { it.title == currentMarker!!.title }

            matchedMarker?.let {
                Log.d("MapsActivity", "Photos at current marker: ${it.photoAtCurrentMarker}")
            } ?: Log.d("MapsActivity", "No matching marker found for title: ${currentMarker!!.title}")

            matchedMarker?.let { markerInstance ->
                val photos = markerInstance.photoAtCurrentMarker
                showGallery(photos)
            } ?: run {
                hideGallery()
            }

            Log.d("MapsActivity", "Marker data: $currentMarker")
            fabActions.visibility = View.VISIBLE
            false  // Return false to allow default behavior (e.g., info window display)
        }

        fabActions.setOnClickListener {
            showUploadBottomSheet()
            Toast.makeText(this, "FAB clicked", Toast.LENGTH_SHORT).show()
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
            pickImageLauncher.launch("image/*")
        }

        submitButton.setOnClickListener {
            if (selectedImageUri == null) {
                Toast.makeText(this, "Please pick an image first", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
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
        if (uri != null) {
            selectedImageUri = uri
            // Show the preview in your ImageView
            previewImageView?.visibility = View.VISIBLE
            previewImageView?.setImageURI(uri)
        }
    }


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

                val prefs = getSharedPreferences("UserPrefs", MODE_PRIVATE)
                val userEmail = prefs.getString("user_email", null) // could be null
                val userEmailReqBody = (userEmail ?: "anonymous@example.com")
                    .toRequestBody("text/plain".toMediaTypeOrNull())

                Log.d("MapsActivity", "User email: $userEmail")

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
                    Toast.makeText(this@MapsActivity, "Upload successful!", Toast.LENGTH_SHORT).show()
                    val uploadData = response.body()

                    val matchedMarker = mapContent.markerList.firstOrNull { it.title == currentMarker!!.title }
                    matchedMarker?.photoAtCurrentMarker?.add(PhotoInstance(
                        imageURL = uploadData?.presignedUrl?: "no url available.",
                        time = Instant.now()
                    ))

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
            else -> BitmapDescriptorFactory.HUE_RED  // Default color if none match
        }
    }

    // Send newly create marker to server
    private fun sendMarkerUpdate(email: String, markerData: MarkerInstance) {
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

                // Convert to Json Request Body
                val locationBody = locationJson.toRequestBody("application/json".toMediaTypeOrNull())

                Log.d("MapsActivity", "Marker update request: $locationBody")

                val response = RetrofitClient.api.putLocation(email, locationBody)

                val message = response.message

                Log.d("MapsActivity", "Marker update response: $message")
            } catch (e: Exception) {
                e.printStackTrace()
                Log.e("MapsActivity", "Network request failed.", e)
            }
        }
    }


}
package com.example.photomap

import android.app.AlertDialog
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
import android.widget.ImageView
import android.widget.Spinner
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
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
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.Locale

class MapsActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var mMap: GoogleMap
    private lateinit var binding: ActivityMapsBinding
    private lateinit var fabActions: FloatingActionButton
    private var selectedImageUri: Uri? = null
    private var previewImageView: ImageView? = null
    private var currentMarker: MarkerInstance? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMapsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        fabActions = findViewById(R.id.fab_actions)
        fabActions.visibility = View.GONE

        val fabRecommendation: FloatingActionButton = findViewById(R.id.recommendation)
        fabRecommendation.visibility = View.VISIBLE

        fabRecommendation.setOnClickListener {
            Toast.makeText(this, "Recommendation clicked!", Toast.LENGTH_SHORT).show()

            //Log.d("MapsActivity", getSharedPreferences("UserPrefs", MODE_PRIVATE).getString("user_email", "")?: "none")

            fetchRecommendation()
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
                val email = prefs.getString("user_email", "")?: "anonymous@example.com"


                val response = RetrofitClient.api.getPopularLocations(email)

                if (response.isSuccessful && response.body() != null) {
                    val popularLocation = response.body()!!.popularLocation
                    val lat = popularLocation.position.lat
                    val lng = popularLocation.position.lng
                    val tags = popularLocation.tags
                    // You can also update the UI
                    Toast.makeText(this@MapsActivity, "Got recommendation", Toast.LENGTH_SHORT).show()
                    Log.d("MapsActivity", "Got recommendation at ($lat, $lng), with tags: $tags")

                    //Call Places API to get recommendation
                    val keywordQuery = tags.firstOrNull() ?: ""
                    //fetchNearbyPlaces("$lat,$lng", "school")
                    fetchNearbyPlaces("49.2666656, -123.249999", "market")


                } else {
                    val errorMsg = response.errorBody()?.string()
                    Toast.makeText(this@MapsActivity, "Receive recommendation failed", Toast.LENGTH_LONG).show()
                    Log.e("MapsActivity", "Receive recommendation failed: $errorMsg")

                }
            } catch (e: Exception) {
                // Handle the error
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Failed to fetch recommendation.", Toast.LENGTH_SHORT).show()
            }
        }
    }


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
                    // Process the list of places, for example choose the closest match
                    val bestPlace = response.results.firstOrNull()
                    bestPlace?.let {
                        val lat = it.geometry.location.lat
                        val lng = it.geometry.location.lng
                        // Add a marker on your map at these coordinates
                        mMap.addMarker(MarkerOptions().
                            position(LatLng(lat, lng)).
                            title(it.name).
                            icon(BitmapDescriptorFactory.defaultMarker(getHueFromColor("violet"))))
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

            val success = mMap.setMapStyle(
                MapStyleOptions.loadRawResourceStyle(this, R.raw.map_style)
            )
            if (!success) {
                Log.e("MapsActivity", "Style parsing failed.")
            }
        } catch (e: Resources.NotFoundException) {
            Log.e("MapsActivity", "Can't find style. Error: ", e)
        }

        // Add markers
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

            fabActions.visibility = View.GONE

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

                    //Tag the color
                    marker?.tag = selectedColor  // Store the hue as the tag
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        // Set marker click listener
        mMap.setOnMarkerClickListener { marker ->
            // Display the FAB when any marker is clicked
            val lat = marker.position.latitude
            val lng = marker.position.longitude
            val markerTitle = marker.title ?: "Untitled Marker"
            // If you're storing color somewhere, retrieve it; otherwise default:
            val markerColor = marker.tag ?: "red"

            // 2) Use Geocoder to get a city name from lat-lng
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

            Log.d("MapsActivity", "Marker data: $currentMarker")

            fabActions.visibility = View.VISIBLE
            false  // Return false to allow default behavior (e.g., info window display)
        }

        fabActions.setOnClickListener {
            // Step 2: Show the bottom sheet
            showUploadBottomSheet()
            Toast.makeText(this, "FAB clicked", Toast.LENGTH_SHORT).show()
        }

        // Add a marker in Sydney and move the camera
        val van = LatLng(49.2666656, -123.249999)
        val marker = mMap.addMarker(MarkerOptions().position(van).title("Marker in Van"))
        val zoomLevel = 15f // Adjust this value to set the desired zoom level
        mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(van, zoomLevel))
        marker?.showInfoWindow()
    }

    // Upload photos
    private fun showUploadBottomSheet() {
        val bottomSheetDialog = BottomSheetDialog(this)
        val view = layoutInflater.inflate(R.layout.bottom_sheet_upload, null)
        bottomSheetDialog.setContentView(view)

        // Get references to buttons
        val pickPhotoButton = view.findViewById<Button>(R.id.btn_pick_photo)
        val submitButton = view.findViewById<Button>(R.id.btn_submit_upload)
        val previewImageView = view.findViewById<ImageView>(R.id.imagePreview)
        this.previewImageView = previewImageView


        // Step 3: Implement picking a photo
        pickPhotoButton.setOnClickListener {
            pickImageLauncher.launch("image/*")
        }

        // Step 4: Submit the photo (upload to AWS)
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
            // Store the selected URI
            selectedImageUri = uri

            // Show the preview in your ImageView
            previewImageView?.visibility = View.VISIBLE
            previewImageView?.setImageURI(uri)
        }
    }


    private fun uploadPhotoToAWS() {
        lifecycleScope.launch {
            try {
                // 1) Convert your selectedImageUri to a MultipartBody.Part
                val imagePart = createImagePart(selectedImageUri!!)

                // 2) Build a RequestBody for the description (if needed)
                val description = "This is a test description"
                val descriptionBody = description.toRequestBody("text/plain".toMediaTypeOrNull())

                // 3) Build a JSON string for your location
                //    For example, lat, lng, markerTitle, markerColor, etc.
                val locationJson = JSONObject().apply {
                    put("position", JSONObject().apply {
                        put("lat", currentMarker?.lat ?: 0.0)
                        put("lng", currentMarker?.lng ?: 0.0)
                    })
                    put("title", currentMarker?.title ?: "Untitled")
                    put("location", currentMarker?.location ?: "Unknown")
                    put("icon", currentMarker?.color ?: "red")
                }.toString()

                // 4) Convert that JSON to a RequestBody
                val locationBody = locationJson.toRequestBody("application/json".toMediaTypeOrNull())

                val prefs = getSharedPreferences("UserPrefs", MODE_PRIVATE)
                val userEmail = prefs.getString("user_email", null) // could be null
                val userEmailReqBody = (userEmail ?: "anonymous@example.com") // handle null case
                    .toRequestBody("text/plain".toMediaTypeOrNull())

                Log.d("MapsActivity", "User email: $userEmail")


                val response = RetrofitClient.api.uploadPhoto(
                    image = imagePart,
                    description = descriptionBody,
                    uploader = userEmailReqBody,
                    location = locationBody
                )

                // 6) Check if successful
                if (response.isSuccessful) {
                    // Show success
                    Toast.makeText(this@MapsActivity, "Upload successful!", Toast.LENGTH_SHORT).show()
                    val uploadData = response.body()

                    Log.d("MapsActivity", "Upload response: $uploadData")

                    // check response output
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
        // 1) Open input stream for the image
        val inputStream = contentResolver.openInputStream(uri) ?: throw IllegalStateException("Unable to open image")

        // 2) Read bytes
        val fileBytes = inputStream.readBytes()
        inputStream.close()

        // 3) Create RequestBody for the image
        val requestFile = fileBytes.toRequestBody("image/*".toMediaTypeOrNull())

        // 4) Wrap it in MultipartBody.Part with form field name "image"
        return MultipartBody.Part.createFormData(
            "image",               // must match your API field name
            "filename",        // will be ignored by alex's code
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


}
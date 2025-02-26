package com.example.photomap

import android.app.AlertDialog
import android.content.res.Resources
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

class MapsActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var mMap: GoogleMap
    private lateinit var binding: ActivityMapsBinding
    private lateinit var fabActions: FloatingActionButton
    private var selectedImageUri: Uri? = null
    private var previewImageView: ImageView? = null


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMapsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        fabActions = findViewById(R.id.fab_actions)
        fabActions.visibility = View.GONE

        // Obtain the SupportMapFragment and get notified when the map is ready to be used.
        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
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
                    mMap.addMarker(
                        MarkerOptions()
                            .position(latLng)
                            .title(markerTitle)
                            .icon(BitmapDescriptorFactory.defaultMarker(hue))
                    )
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        // Set marker click listener
        mMap.setOnMarkerClickListener { marker ->
            // Display the FAB when any marker is clicked
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

                    put("lat", 49.2666656)
                    put("lng", -123.249999)
                    put("markerTitle", "My Custom Marker")
                    put("markerColor", "red")
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

                    // check response output
                } else {
                    // Show error
                    val errorMsg = response.errorBody()?.string()
                    Toast.makeText(this@MapsActivity, "Upload failed: $errorMsg", Toast.LENGTH_LONG).show()
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
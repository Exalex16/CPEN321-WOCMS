package com.example.photomap
import android.app.AlertDialog
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalContext
import androidx.core.text.HtmlCompat
import androidx.core.view.GravityCompat
import androidx.drawerlayout.widget.DrawerLayout
import androidx.lifecycle.lifecycleScope
import androidx.localbroadcastmanager.content.LocalBroadcastManager
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
import com.google.android.gms.maps.model.Marker
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.selects.select
import retrofit2.HttpException

class MapsActivity : AppCompatActivity(), OnMapReadyCallback {

    // Constants
    private val TAG: String = "MapsActivity"
    private var addMarkerDialog: AlertDialog? = null
    private val addedPlaces = mutableListOf<Place>()
    private val markerUpdateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            Log.d("MapsActivity", "Received marker update broadcast")
            Log.d("MapsActivity", mapContent.markerList.toString())
            loadMarkers()
            markerAdapter.refreshMarkerList(mapContent.markerList)
        }
    }

    private lateinit var USER_EMAIL: String
    internal lateinit var mMap: GoogleMap
    private lateinit var binding: ActivityMapsBinding
    private lateinit var fabActions: FloatingActionButton
    private lateinit var fabDeleteMarker: FloatingActionButton
    private lateinit var markerAdapter: MarkerAdapter
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var recyclerView: RecyclerView
    private lateinit var noMarkersText: TextView
    private lateinit var composeView : ComposeView

    private var currentMarker: MarkerInstance? = null

    lateinit var photoUploader: PhotoUploader
    lateinit var recommendationManager: RecommendationManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMapsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Classes
        photoUploader = PhotoUploader(
            activity = this,
            galleryContainer = findViewById(R.id.galleryContainer),
            imageGalleryRecycler = findViewById(R.id.imageGalleryRecycler),
            noImagesText = findViewById(R.id.noImagesText)
        )
        recommendationManager = RecommendationManager(this, addedPlaces)

        // Live update receiver
        LocalBroadcastManager.getInstance(this)
            .registerReceiver(markerUpdateReceiver, IntentFilter("com.yourapp.ACTION_MARKERS_UPDATED"))

        // Hidden Buttons
        fabActions = findViewById(R.id.fab_actions)
        fabActions.visibility = View.GONE

        fabDeleteMarker = findViewById(R.id.deleteMarker)
        fabDeleteMarker.visibility = View.GONE

        // Drawer Layout
        drawerLayout = findViewById(R.id.drawer_layout)
        recyclerView = findViewById(R.id.marker_recycler_view)
        noMarkersText= findViewById(R.id.noMarkersText)

        //compose userCenter
        composeView = findViewById(R.id.user_center_view)

        // Recommendation button
        val fabRecommendation: FloatingActionButton = findViewById(R.id.recommendation)
        fabRecommendation.visibility = View.VISIBLE
        fabRecommendation.setOnClickListener {
            recommendationManager.fetchRecommendation(USER_EMAIL) { selectedPlace ->
                addRecommendationMarkerOnMap(selectedPlace)
            }
        }

        // Album Button
        val fabAlbum: FloatingActionButton = findViewById(R.id.album)
        fabAlbum.visibility = View.VISIBLE
        fabAlbum.setOnClickListener {

            val intent = Intent(this, GalleryActivity::class.java)
            startActivity(intent)
        }

        // User Centre Button
        val fabUserCentre: FloatingActionButton = findViewById(R.id.usercentre)
        fabUserCentre.visibility = View.VISIBLE
        fabUserCentre.setOnClickListener {

            showUserCenterOverlay(composeView)
        }

        // Help Button
        val fabHelp: FloatingActionButton = findViewById(R.id.help)
        fabHelp.visibility = View.VISIBLE
        fabHelp.setOnClickListener {

            val tutorialDialog = TutorialDialogFragment()
            tutorialDialog.show(supportFragmentManager, "TutorialDialog")
        }

        // Obtain the SupportMapFragment and get notified when the map is ready to be used.
        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    private fun addRecommendationMarkerOnMap(selectedPlace: Place) {
        val lat = selectedPlace.geometry.location.lat
        val lng = selectedPlace.geometry.location.lng

        if (mapContent.markerList.any { it.lat == lat && it.lng == lng }) {
            addedPlaces.add(selectedPlace)
            mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 15f))
            Log.d(TAG, "Marker already exists at this location, skipping duplicate.")
            return
        }

        val markerTitle = "Popular - " + selectedPlace.name
        val selectedColor = "azure"
        val cityName = MapUtils.getCityName(this, lat, lng)

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
                "Add Recommendation Marker Successful!",
                Snackbar.LENGTH_SHORT
            ).show()
            addedPlaces.add(selectedPlace)
            Log.d("MapsActivity", "Addedplaces: $addedPlaces")
            mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 15f))
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
        Log.d("MapsActivity", "Begin loading map.")

        // Load map syle
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

        loadMarkers()
        // Listeners
        mMap.setOnMapClickListener { latLng ->
           showAddMarkerDialog(latLng)
        }
        // Set marker click listener
        mMap.setOnMarkerClickListener { marker ->
            handleMarkerClick(marker)
        }

        // Navigation panel
        markerAdapter = MarkerAdapter(mapContent.markerList, noMarkersText, recyclerView) { markerInstance ->
            // Animate the map camera to the selected marker's location
            mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(markerInstance.lat, markerInstance.lng), 15f))
            // Close the drawer after selection
            drawerLayout.closeDrawer(GravityCompat.START)
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = markerAdapter

        markerAdapter.refreshMarkerList(mapContent.markerList)

        fabActions.setOnClickListener {
            photoUploader.showUploadBottomSheet(currentMarker, USER_EMAIL){
                Snackbar.make(
                    findViewById(android.R.id.content), // Or a specific CoordinatorLayout
                    "Upload Successful!",
                    Snackbar.LENGTH_LONG
                ).show()
            }
        }

        fabDeleteMarker.setOnClickListener {
            val builder = AlertDialog.Builder(this)
            builder.setTitle("Warning")
            builder.setMessage("If you delete this marker, all images tagged to this marker will also be deleted. Do you wish to proceed?")
            // Set the positive button action: user confirms deletion
            builder.setPositiveButton("Yes") { _, _ ->
                deleteMarker()
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

    //Load Markers
    private fun loadMarkers() {
        // Add saved markers to map
        Log.d("MapsActivity", "LoadMarkerTrigger")
        Log.d("MapsActivity", mapContent.markerList.toString())
        for (marker in mapContent.markerList) {
            val position = LatLng(marker.lat, marker.lng)

            val drawnMarker = mMap.addMarker(
                MarkerOptions()
                    .position(position)
                    .title(marker.title)
                    .icon(BitmapDescriptorFactory.defaultMarker(MapUtils.getHueFromColor(marker.color)))
            )

            // Assign marker tag and reference
            drawnMarker?.tag = marker.color
            marker.drawnMarker = drawnMarker
        }

        // Adjust the camera to the first marker
        val firstMarker = mapContent.markerList.firstOrNull()
        if (firstMarker != null) {
            val position = LatLng(firstMarker.lat, firstMarker.lng)
            Log.d("MapsActivity", "Moving camera to: $position")
            mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(position, 15f))
        } else {
            MapUtils.centerMapOn(mMap, 49.2827, -123.1207) // Default Vancouver
        }
    }


    //Listeners:
    private fun showAddMarkerDialog(latLng: LatLng) {
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
        photoUploader.hideGallery()

        // Build and display the AlertDialog
        addMarkerDialog = AlertDialog.Builder(this)
            .setTitle("Add Marker")
            .setView(dialogView)
            .setPositiveButton("Add") { _, _ ->

                // Store the marker data
                currentMarker = MarkerInstance(
                    lat = latLng.latitude,
                    lng = latLng.longitude,
                    title = if (titleEditText.text.toString().isBlank()) "NoName Marker" else titleEditText.text.toString(),
                    color = colorSpinner.selectedItem.toString(),
                    location = MapUtils.getCityName(this, latLng.latitude, latLng.longitude),
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

    private fun handleMarkerClick(marker: Marker): Boolean {
        // Store the marker data
        currentMarker = MarkerInstance(
            lat = marker.position.latitude,
            lng = marker.position.longitude,
            title = marker.title ?: "Untitled Marker",
            color = (marker.tag ?: "unknown Color").toString(),
            location = MapUtils.getCityName(this, marker.position.latitude, marker.position.longitude),
            photoAtCurrentMarker = arrayListOf()
        )
        Log.d("MapsActivity", "current Marker data before match: $currentMarker")

        // Find the matching marker from mapContent
        val matchedMarker = mapContent.markerList.firstOrNull {
            it.title == currentMarker!!.title &&
                    it.lat == currentMarker!!.lat &&
                    it.lng == currentMarker!!.lng
        }

        currentMarker = matchedMarker
        Log.d("MapsActivity", "current Marker data after match: $currentMarker")

        // Show or hide the gallery based on matched marker
        matchedMarker?.let { markerInstance ->
            photoUploader.showGallery(markerInstance.photoAtCurrentMarker)
        } ?: run {
            photoUploader.hideGallery()
        }

        // Show action buttons
        fabActions.visibility = View.VISIBLE
        fabDeleteMarker.visibility = View.VISIBLE

        return false // Return false to allow default behavior (e.g., info window display)
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

                val response = RetrofitClient.apiUser.deleteMarker(USER_EMAIL, locationJson.toRequestBody("application/json".toMediaTypeOrNull()))
                if (response.isSuccessful) {
                    Log.d("MapsActivity", "Marker delete successful from DB. Now deleting images.")
                    Log.d("MapsActivity", "Photos at current marker before: ${currentMarker?.photoAtCurrentMarker}")

                    //Delete Photos
                    currentMarker?.photoAtCurrentMarker?.let { photos ->
                        // Delete each photo in the list
                        for (photo in photos) {
                            try {
                                if(photo.sharedBy.equals("null") || photo.sharedBy.equals(USER_EMAIL)){
                                    deleteImage(photo.fileName)
                                }else{
                                    RetrofitClient.api.cancelShare(
                                        cancelShareRequest(
                                            imageKey = photo.fileName,
                                            recipientEmail = USER_EMAIL,
                                            senderEmail = photo.sharedBy.toString()
                                        )
                                    )
                                }
                            } catch (e: IOException) {
                                e.printStackTrace()
                                Toast.makeText(this@MapsActivity, "Network error, please check your connection.", Toast.LENGTH_SHORT).show()
                            }
                        }
                        photos.clear()
                    }

                    Log.d("MapsActivity", "Photos at current marker after: ${currentMarker?.photoAtCurrentMarker}")

                    currentMarker?.drawnMarker?.remove() // Remove visual marker on map.
                    Log.d("MapsActivity", "Marker list before: ${mapContent.markerList}")
                    mapContent.markerList.remove(currentMarker)
                    markerAdapter.refreshMarkerList(mapContent.markerList)
                    photoUploader.hideGallery()
                    Log.d("MapsActivity", "Marker list after: ${mapContent.markerList}")
                    Toast.makeText(this@MapsActivity, "Marker deleted successfully", Toast.LENGTH_SHORT).show()
                } else {
                    // Handle error response
                    val errorMsg = response.errorBody()?.string()
                    Log.e("MapsActivity", "Failed to delete marker: $errorMsg")
                    Toast.makeText(this@MapsActivity, "Failed to delete marker: $errorMsg", Toast.LENGTH_LONG).show()
                }
            } catch (e: IOException) {
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Network error, please check your connection.", Toast.LENGTH_SHORT).show()
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
            } catch (e: IOException) {
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
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

                val response = RetrofitClient.apiUser.putLocation(email, locationJson.toRequestBody("application/json".toMediaTypeOrNull()))

                if (response.isSuccessful) {
                    val latlng = LatLng(markerData.lat, markerData.lng)
                    val hue = MapUtils.getHueFromColor(markerData.color)

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
                    markerAdapter.refreshMarkerList(mapContent.markerList)
                    mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(latlng, 15f))

                    // Trigger Callback for Frontend Success Display.
                    onSuccess?.invoke()
                } else {
                    Toast.makeText(this@MapsActivity, "Error: Marker save to backend failed.", Toast.LENGTH_LONG).show()
                    Log.e("MapsActivity", "Failed to update marker: ${response.errorBody()?.string()}")
                }

            } catch (e: IOException) {
                e.printStackTrace()
                Toast.makeText(this@MapsActivity, "Error: Network error, check internet.", Toast.LENGTH_LONG).show()
                Log.e("MapsActivity", "Network request failed.", e)
            }
        }
    }

    override fun onDestroy() {
        addMarkerDialog?.dismiss()
        addMarkerDialog = null
        LocalBroadcastManager.getInstance(this).unregisterReceiver(markerUpdateReceiver)
        super.onDestroy()
    }
}
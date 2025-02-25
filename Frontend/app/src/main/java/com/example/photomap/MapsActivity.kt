package com.example.photomap

import android.app.AlertDialog
import android.content.res.Resources
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.Spinner

import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.example.photomap.databinding.ActivityMapsBinding
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.material.floatingactionbutton.FloatingActionButton

class MapsActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var mMap: GoogleMap
    private lateinit var binding: ActivityMapsBinding
    private lateinit var fabActions: FloatingActionButton


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

        // Add a marker in Sydney and move the camera
        val van = LatLng(49.2666656, -123.249999)
        val marker = mMap.addMarker(MarkerOptions().position(van).title("Marker in Van"))
        val zoomLevel = 15f // Adjust this value to set the desired zoom level
        mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(van, zoomLevel))
        marker?.showInfoWindow()
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
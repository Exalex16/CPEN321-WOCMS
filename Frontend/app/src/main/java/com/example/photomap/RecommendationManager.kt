package com.example.photomap

import android.content.Context
import android.util.Log
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException
import androidx.core.text.HtmlCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.photomap.BuildConfig.MAPS_API_KEY


import com.example.photomap.MapUtils

class RecommendationManager(
    private val activity: AppCompatActivity,
    private val addedPlaces: MutableList<Place>
) {

    // You might want to declare a constant or use one from BuildConfig:
    private val PLACE_SEARCH_RADIUS: Int = 10000
    private val MAX_REC_PLACES: Int = 20

    /**
     * Fetch the recommendation from the backend.
     *
     * @param userEmail The email of the current user.
     * @param onPlaceSelected Callback that receives the selected Place when a recommendation is chosen.
     */
    fun fetchRecommendation(userEmail: String, onPlaceSelected: (Place) -> Unit) {
        activity.lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.getPopularLocations(userEmail)

                if (response.isSuccessful && response.body() != null) {
                    val popularLocation = response.body()!!.popularLocation
                    if (popularLocation == null) {
                        Snackbar.make(
                            activity.findViewById(android.R.id.content),
                            "No recommendation available! Insufficient images or markers.",
                            Snackbar.LENGTH_LONG
                        ).show()
                        Log.e("RecommendationManager", "No recommendation available: insufficient images or markers.")
                    } else {
                        val lat = popularLocation.position.lat
                        val lng = popularLocation.position.lng
                        val tags = popularLocation.tags

                        Toast.makeText(activity, "Got recommendation", Toast.LENGTH_SHORT).show()
                        Log.d("RecommendationManager", "Got recommendation at ($lat, $lng), with tags: $tags")
                        fetchNearbyPlaces("$lat,$lng", lat, lng, tags, onPlaceSelected)
                    }
                } else {
                    val errorMsg = response.errorBody()?.string()
                    Toast.makeText(activity, "Recommendation failed, no places found match.", Toast.LENGTH_LONG).show()
                    Log.e("RecommendationManager", "Receive recommendation failed: $errorMsg")
                }
            } catch (e: HttpException) {
                e.printStackTrace()
                Toast.makeText(activity, "Server error, please try again later.", Toast.LENGTH_LONG).show()
            } catch (e: IOException) {
                e.printStackTrace()
                Toast.makeText(activity, "Network error, please check your connection.", Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * Uses the Places API to fetch nearby places.
     */
    private fun fetchNearbyPlaces(coordinate: String, lat: Double, lng: Double, tags: List<String>, onPlaceSelected: (Place) -> Unit) {
        activity.lifecycleScope.launch {
            val finalPlacesList = mutableListOf<Place>()
            // Launch async calls for each tag concurrently.
            val deferredResults = tags.map { tag ->
                async {
                    try {
                        val response = RetrofitPlacesClient.api.nearbySearch(
                            location = coordinate,
                            radius = PLACE_SEARCH_RADIUS,
                            keyword = tag,
                            apiKey = MAPS_API_KEY // or use BuildConfig.MAPS_API_KEY
                        )
                        Log.d("RecommendationManager", "Tag used: $tag")
                        if (response.isSuccessful) {
                            response.body()!!.results
                        } else {
                            Log.e("RecommendationManager", "Zero response found for tag: $tag")
                            emptyList()
                        }
                    } catch (e: IOException) {
                        e.printStackTrace()
                        Toast.makeText(activity, "Network error, please check your connection.", Toast.LENGTH_LONG).show()
                        emptyList()
                    } catch (e: HttpException) {
                        e.printStackTrace()
                        Toast.makeText(activity, "Server error, please try again later.", Toast.LENGTH_LONG).show()
                        emptyList()
                    }
                }
            }
            deferredResults.awaitAll().forEach { results ->
                finalPlacesList.addAll(results)
            }
            // Deduplicate and take the top recommendations.
            var uniquePlaces = finalPlacesList.distinctBy { it.placeId }.take(MAX_REC_PLACES)
            // Optionally, filter out places that are already added.
            Log.d("RecommendationManager", "Added Places in RM: ${addedPlaces}")
            uniquePlaces = uniquePlaces.filterNot { place -> addedPlaces.any { it.placeId == place.placeId } }

            Log.d("RecommendationManager", "Final places list size: ${uniquePlaces.size}")
            showRecommendationBottomSheet(lat, lng, tags, uniquePlaces, onPlaceSelected)
        }
    }

    /**
     * Displays a bottom sheet with the recommendation details and list of places.
     */
    private fun showRecommendationBottomSheet(lat: Double, lng: Double, tags: List<String>, places: List<Place>, onPlaceSelected: (Place) -> Unit) {
        val bottomSheetDialog = BottomSheetDialog(activity)
        val view = activity.layoutInflater.inflate(R.layout.bottom_sheet_recommendation, null)
        bottomSheetDialog.setContentView(view)

        // Get references to UI elements in the BottomSheet.
        val tvSummary = view.findViewById<TextView>(R.id.tvSummary)
        val rvSuggestedPlaces = view.findViewById<RecyclerView>(R.id.rvSuggestedPlaces)
        val tvNoPlacesMessage = view.findViewById<TextView>(R.id.tvNoPlacesMessage)

        // Construct a summary string.
        val tagsString = if (tags.isNotEmpty()) tags.joinToString(", ") else "No tags available"
        val cityName = MapUtils.getCityName(activity, lat, lng)
        val summaryText = HtmlCompat.fromHtml(
            "<b>You appear to be most active around:</b><br> $cityName <br><br>" +
                    "<b>Your uploaded photos commonly feature these objects or themes:</b><br> $tagsString <br><br>" +
                    "Here is a list of locations matching your photo themes that might pique your interest!",
            HtmlCompat.FROM_HTML_MODE_LEGACY
        )
        tvSummary.text = summaryText

        // Configure the RecyclerView based on whether there are suggested places.
        if (places.isEmpty()) {
            tvNoPlacesMessage.visibility = android.view.View.VISIBLE
            rvSuggestedPlaces.visibility = android.view.View.GONE
        } else {
            tvNoPlacesMessage.visibility = android.view.View.GONE
            rvSuggestedPlaces.visibility = android.view.View.VISIBLE
            val adapter = PlaceAdapter(activity, places) { selectedPlace ->
                // Instead of handling marker addition here,
                // use the callback to let MapsActivity add the marker.
                onPlaceSelected(selectedPlace)
                bottomSheetDialog.dismiss()
            }
            rvSuggestedPlaces.layoutManager = LinearLayoutManager(activity)
            rvSuggestedPlaces.adapter = adapter
        }
        bottomSheetDialog.show()
    }
}

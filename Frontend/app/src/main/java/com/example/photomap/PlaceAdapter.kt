package com.example.photomap

import android.content.Context
import android.location.Geocoder
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import java.io.IOException
import java.util.Locale

class PlaceAdapter(private val context: Context,
                   private val places: List<Place>,
                   private val onItemClick: (Place) -> Unit ) : RecyclerView.Adapter<PlaceAdapter.PlaceViewHolder>() {

    inner class PlaceViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvPlaceName: TextView = itemView.findViewById(R.id.tvPlaceName)
        val tvCityName: TextView = itemView.findViewById(R.id.tvCityName)
        val tvRating: TextView = itemView.findViewById(R.id.tvRating)
        val tvVicinity: TextView = itemView.findViewById(R.id.tvVicinity)

    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PlaceViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_place, parent, false)
        return PlaceViewHolder(view)
    }

    override fun onBindViewHolder(holder: PlaceViewHolder, position: Int) {
        val place = places[position]
        holder.tvPlaceName.text = place.name
        // Convert geometry to a city name. Implement this function based on your needs.
        holder.tvCityName.text = MapUtils.getCityName(context, place.geometry.location.lat, place.geometry.location.lng)
        // Display the rating or a fallback value
        holder.tvRating.text = "Rating: ${place.rating ?: "N/A"}"

        holder.tvVicinity.text = place.vicinity

        holder.itemView.setBackgroundColor(
            if (position % 2 == 0)
                ContextCompat.getColor(context, R.color.light_blue)
            else
                ContextCompat.getColor(context, R.color.light_green)
        )

        holder.itemView.setOnClickListener {
            onItemClick(place) // Pass the clicked place to the callback function
        }
    }

    override fun getItemCount(): Int = places.size

}

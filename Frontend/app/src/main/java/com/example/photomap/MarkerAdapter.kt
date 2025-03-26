package com.example.photomap

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.photomap.MapUtils.getColorIntFromName

class MarkerAdapter(
    private val markers: List<MarkerInstance>,
    private val onMarkerClick: (MarkerInstance) -> Unit
) : RecyclerView.Adapter<MarkerAdapter.MarkerViewHolder>() {

    inner class MarkerViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val colorView: View = itemView.findViewById(R.id.markerColor)
        val titleView: TextView = itemView.findViewById(R.id.markerTitle)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MarkerViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_marker, parent, false)
        return MarkerViewHolder(view)
    }

    override fun onBindViewHolder(holder: MarkerViewHolder, position: Int) {
        val marker = markers[position]
        // Tint the color indicator with the marker's color
        holder.colorView.background.setTint(getColorIntFromName(marker.color))
        holder.titleView.text = marker.title

        holder.itemView.setOnClickListener {
            onMarkerClick(marker)
        }
    }

    override fun getItemCount() = markers.size
}

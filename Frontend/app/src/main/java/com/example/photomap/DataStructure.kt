package com.example.photomap

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView
import java.time.Instant
import com.bumptech.glide.Glide
import com.google.android.gms.maps.model.Marker


class GalleryAdapter(
    private val imageUrls: List<String>
) : RecyclerView.Adapter<GalleryAdapter.GalleryViewHolder>() {

    inner class GalleryViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val imageView: ImageView = itemView.findViewById(R.id.galleryImageView)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GalleryViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_gallery_image, parent, false)
        return GalleryViewHolder(view)
    }

    override fun onBindViewHolder(holder: GalleryViewHolder, position: Int) {
        val url = imageUrls[position]
        // Use Glide to load the image
        Glide.with(holder.imageView.context)
            .load(url)
            .placeholder(R.drawable.placeholder) // optional placeholder
            .into(holder.imageView)
    }

    override fun getItemCount(): Int = imageUrls.size
}


//UploadResponse
// ? means nullible data
data class UploadResponse(
    val message: String?,
    val fileName: String?,
    val presignedUrl: String?,
    val metadata: Metadata?
)

// RecommendationResponse
data class PopularLocationResponse(
    val popularLocation: PopularLocation
)

data class PopularLocation(
    val position: Position,
    val tags: List<String>
)

data class Position(
    val lat: Double,
    val lng: Double
)

data class PutLocationResponse(
    val message: String,
    val addedLocation: AddedLocationData
)

data class AddedLocationData(
    val position: Location,
    val title: String,
    val location: String,
    val icon: String
)

//PhotoResponse
data class Metadata(
    val uploadedBy: String,
    val timestamp: String,
)

data class PhotoInstance(
    val imageURL:  String,
    val time: Instant,
    val fileName: String
)

data class UserPostRequest(
    val googleEmail: String,
    val googleName: String
)

//BestPlaces Response
data class PlacesResponse(
    val results: List<PlaceResult>,
    val status: String
)

data class PlaceResult(
    val name: String,
    val geometry: Geometry,
    val types: List<String>
)

data class Geometry(
    val location: Location
)

data class Location(
    val lat: Double,
    val lng: Double
)

data class MarkerInstance(
    val lng: Double,
    val lat: Double,
    val title: String,
    val location: String,
    val color: String,
    val photoAtCurrentMarker: ArrayList<PhotoInstance>,
    var drawnMarker: Marker? = null
)

data class DeleteMarkerResponse(
    val message: String
)

data class DeleteImageResponse(
    val message: String
)





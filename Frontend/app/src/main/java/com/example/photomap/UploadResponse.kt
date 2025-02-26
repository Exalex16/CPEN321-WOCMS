package com.example.photomap

// ? means nullible data
data class UploadResponse(
    val message: String?,
    val fileName: String?,
    val imageUrl: String?,
    val metadata: Metadata?
)

data class Metadata(
    val uploadedBy: String,
    val timestamp: String,
)

data class PhotoInstance(
    val imageURL:  String,
    val marker: MarkerInstance,
    val timeString: String
)

data class MarkerInstance(
    val lng: Float,
    val lat: Float,
    val title: String,
    val location: String,
    val color: String
)

object mapContent{
    val imageList: ArrayList<PhotoInstance> = arrayListOf()
    val markerList: ArrayList<MarkerInstance> = arrayListOf()

}



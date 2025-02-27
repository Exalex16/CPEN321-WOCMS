package com.example.photomap

import java.time.Instant

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
    val time: Instant
)

data class UserPostRequest(
    val googleEmail: String,
    val googleName: String
)


data class MarkerInstance(
    val lng: Double,
    val lat: Double,
    val title: String,
    val location: String,
    val color: String,
    //val photoAtCurrentMarker: ArrayList<PhotoInstance>
)





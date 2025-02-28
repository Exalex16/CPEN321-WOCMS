package com.example.photomap

import java.time.Instant

//UploadResponse
// ? means nullible data
data class UploadResponse(
    val message: String?,
    val fileName: String?,
    val imageUrl: String?,
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
    val message: String
)

//PhotoResponse
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
    val photoAtCurrentMarker: ArrayList<PhotoInstance>
)





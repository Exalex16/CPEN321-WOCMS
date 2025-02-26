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


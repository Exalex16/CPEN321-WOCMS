package com.example.photomap

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response

// ✅ Use Retrofit annotations
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface ApiService {
    @Multipart
    @POST("upload")
    suspend fun uploadPhoto(
        @Part image: MultipartBody.Part,
        @Part("description") description: RequestBody,
        @Part("uploadedBy") uploader: RequestBody,
        @Part("location") location: RequestBody
    ): Response<UploadResponse>
}
package com.example.photomap

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET

// ✅ Use Retrofit annotations
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

interface ApiService {
    @Multipart
    @POST("upload")
    suspend fun uploadPhoto(
        @Part image: MultipartBody.Part,
        @Part("description") description: RequestBody,
        @Part("uploadedBy") uploader: RequestBody,
        @Part("location") location: RequestBody
    ): Response<UploadResponse>



    @POST("user")
    suspend fun createUser(@Body request: UserPostRequest)





    @GET("images/uploader/{email}")
    suspend fun getImagesByUser(@Path("email") email: String): Response<ResponseBody>

    @GET("user/{email}")
    suspend fun getMarkerByUser(@Path("email") email: String): Response<ResponseBody>
}
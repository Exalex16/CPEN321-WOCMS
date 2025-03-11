package com.example.photomap

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP

// ✅ Use Retrofit annotations
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @Multipart
    @POST("upload")
    suspend fun uploadPhoto(
        @Part image: MultipartBody.Part,
        @Part("description") description: RequestBody,
        @Part("uploadedBy") uploader: RequestBody,
        @Part("location") location: RequestBody,
        @Part("sharedTo") sharedTo: RequestBody,
        @Part("shared") shared: RequestBody,
        @Part("sharedBy") sharedBy: RequestBody
    ): Response<UploadResponse>

    @POST("user")
    suspend fun createUser(@Body request: UserPostRequest)

    @GET("images/uploader/{email}")
    suspend fun getImagesByUser(@Path("email") email: String): Response<ResponseBody>

    @GET("user/{email}")
    suspend fun getMarkerByUser(@Path("email") email: String): Response<ResponseBody>

    @GET("map/popular-locations/{username}")
    suspend fun getPopularLocations(
        @Path("username") username: String
    ): Response<PopularLocationResponse>

    @PUT("user/{email}")
    suspend fun putLocation(
        @Path("email") email: String,
        @Body location: RequestBody
    ): Response<PutLocationResponse>

    @POST("user/{email}/location")
    suspend fun deleteMarker(
        @Path("email") userEmail: String,
        @Body location: RequestBody
    ): Response<DeleteMarkerResponse>

    @DELETE("image/{fileName}")
    suspend fun deleteImage(
        @Path("fileName") fileName: String
    ): Response<DeleteImageResponse>
}

interface GooglePlacesApi {
    @GET("maps/api/place/nearbysearch/json")
    suspend fun nearbySearch(
        @Query("location") location: String,  // "lat,lng"
        @Query("radius") radius: Int,           // in meters
        @Query("keyword") keyword: String,            // e.g., "park"
        @Query("key") apiKey: String
    ): PlacesResponse  // Define this data class to match the JSON response structure
}
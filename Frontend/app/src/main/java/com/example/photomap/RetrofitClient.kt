package com.example.photomap

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    private val retrofit by lazy {
        Retrofit.Builder()
            .baseUrl("https://wocmpphotomap.com/") // our domain
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val api: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    val apiUser: ApiServiceUser by lazy {
        retrofit.create(ApiServiceUser::class.java)
    }
}

object RetrofitPlacesClient {
    private const val BASE_URL = "https://maps.googleapis.com/"

    val api: GooglePlacesApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(GooglePlacesApi::class.java)
    }
}

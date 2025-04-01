// File: DataUtils.kt
package com.example.photomap

import okhttp3.ResponseBody
import org.json.JSONArray
import org.json.JSONObject
import retrofit2.Response
import java.time.Instant

fun mapContentInit(photoResponse: Response<ResponseBody>, markerResponse: Response<ResponseBody>) {
    val photoJsonArr = JSONObject(photoResponse.body()!!.string()).getJSONArray("images")
    val markerJson = JSONObject(markerResponse.body()!!.string()).getJSONArray("locations")

    MainActivity.mapContent.markerList.clear()
    MainActivity.mapContent.imageList.clear()

    for (i in 0 until markerJson.length()) {
        val marker = markerJson.getJSONObject(i)
        val position = marker.getJSONObject("position")
        val lat = position.getDouble("lat")
        val lng = position.getDouble("lng")
        val title = marker.getString("title")
        val location = marker.getString("location")
        val color = marker.getString("icon")

        MainActivity.mapContent.markerList.add(
            MarkerInstance(
                lat = lat,
                lng = lng,
                title = title,
                location = location,
                color = color,
                photoAtCurrentMarker = arrayListOf()
            )
        )
    }

    for (i in 0 until photoJsonArr.length()) {
        val imageObject = photoJsonArr.getJSONObject(i)
        val imageUrl = imageObject.getString("presignedUrl")
        val time = Instant.parse(imageObject.getString("timestamp"))
        val fileName = imageObject.getString("fileName")
        val sharedToArr = imageObject.optJSONArray("sharedTo") ?: JSONArray()
        val sharedTo = MutableList(sharedToArr.length()) { sharedToArr.getString(it) }
        val shared = imageObject.getBoolean("shared")
        val sharedBy = imageObject.getString("sharedBy")

        val photo = PhotoInstance(imageUrl, time, fileName, sharedTo, shared, sharedBy)
        MainActivity.mapContent.imageList.add(photo)

        val location = imageObject.getJSONObject("location").getJSONObject("position")
        val lat = location.getDouble("lat")
        val lng = location.getDouble("lng")

        MainActivity.mapContent.markerList.firstOrNull {
            it.lat == lat && it.lng == lng
        }?.photoAtCurrentMarker?.add(photo)
    }
}

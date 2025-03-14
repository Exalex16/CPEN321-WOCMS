package com.example.photomap

import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.log


class MainActivity : AppCompatActivity() {
    companion object{
        private const val TAG = "MainActivity"
    }

    object mapContent{
        val imageList: ArrayList<PhotoInstance> = arrayListOf()
        val markerList: ArrayList<MarkerInstance> = arrayListOf()
    }

    object userInfo{
        val friends:MutableList<String> = mutableListOf()
    }


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val userToken = getUserToken()
        if(userToken == null){
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
            finish()
        }else{

            setContentView(R.layout.activity_main)
            ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.login_button)) { v, insets ->
                val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
                insets
            }
            Log.d(TAG,userToken)
            lifecycleScope.launch {
                val photoResponse = withContext(Dispatchers.IO) {
                    RetrofitClient.api.getImagesByUser(userToken)
                }
                val markerResponse =  withContext(Dispatchers.IO) {
                    RetrofitClient.api.getMarkerByUser(userToken)
                }

                val friendsResponse =  withContext(Dispatchers.IO) {
                    RetrofitClient.api.getFriendsByUser(userToken)
                }

                if(friendsResponse.isSuccessful && friendsResponse.body() != null){
                    Log.d(TAG,  "Tiggers")
                    val friendsList = JSONObject(friendsResponse.body()!!.string()).optJSONArray("friends") ?: JSONArray()
                    for(i in 0 until friendsList.length()){
                        userInfo.friends.add(friendsList.optString(i))
                    }


                }

                if(photoResponse.isSuccessful && photoResponse.body() != null &&
                    markerResponse.isSuccessful && markerResponse.body() != null){
                    val photoJsonArr = JSONObject(photoResponse.body()!!.string()).getJSONArray("images")
                    val markerJson = JSONObject(markerResponse.body()!!.string()).getJSONArray("locations")

                    Log.d(TAG,  photoJsonArr.toString())
                    Log.d(TAG, markerJson.toString())

                    //Clear the list
                    mapContent.markerList.clear()
                    mapContent.imageList.clear()

                    for(i in 0 until markerJson.length()){
                        val marker = markerJson.getJSONObject(i)
                        val position = marker.getJSONObject("position")
                        val lat = position.getDouble("lat")
                        val lang = position.getDouble("lng")
                        val title = marker.getString("title")
                        val location = marker.getString("location")
                        val color = marker.getString("icon")

                        mapContent.markerList.add(MarkerInstance(
                            lat = lat,
                            lng = lang,
                            title = title,
                            location = location,
                            color = color,
                            photoAtCurrentMarker = arrayListOf()
                        ))
                    }

                    for(i in 0 until photoJsonArr.length()){
                        val imageObject = photoJsonArr.getJSONObject(i)
                        val imageUrl = imageObject.getString("presignedUrl")
                        val time = Instant.parse(imageObject.getString("timestamp"))
                        val fileName = imageObject.getString("fileName")
                        val sharedToArr = imageObject.optJSONArray("sharedTo") ?: JSONArray()
                        val sharedTo = MutableList(sharedToArr.length()) { sharedToArr.getString(it) }
                        val shared =imageObject.getBoolean("shared")
                        val sharedBy = imageObject.getString("sharedBy")
                        val photo = PhotoInstance(
                            imageURL = imageUrl,
                            time = time,
                            fileName = fileName,
                            sharedTo = sharedTo,
                            shared = shared,
                            sharedBy = sharedBy
                        )

                        mapContent.imageList.add(photo)

                        val location = imageObject.getJSONObject("location").getJSONObject("position")
                        val lat = location.getDouble("lat")
                        val lng = location.getDouble("lng")
                        for(i in 0 until mapContent.markerList.size){
                            if(lat == mapContent.markerList[i].lat && lng == mapContent.markerList[i].lng){
                                mapContent.markerList[i].photoAtCurrentMarker.add(photo)
                            }
                        }

                    }
                    Log.d(TAG,  mapContent.imageList.toString())
                    Log.d(TAG,  userInfo.friends.toString())
                    //Log.d(TAG,  mapContent.imageList.toString())
                    //Log.d(TAG,  photoJsonArr.toString())
                    //Log.d(TAG, markerJson.toString())

                    // If the user is logged in, go to MapsActivity
                    val intent = Intent(this@MainActivity, MapsActivity::class.java)
                    startActivity(intent)
                    finish()
                }


            }
        }

    }

    private fun getUserToken(): String? {
        val sharedPreferences: SharedPreferences = getSharedPreferences("UserPrefs", MODE_PRIVATE)
        return sharedPreferences.getString("user_email", null)
    }
}
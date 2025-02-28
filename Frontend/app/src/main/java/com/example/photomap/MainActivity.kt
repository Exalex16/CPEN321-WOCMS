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
                if(photoResponse.isSuccessful && photoResponse.body() != null &&
                    markerResponse.isSuccessful && markerResponse.body() != null){
                    val photoJsonArr = JSONObject(photoResponse.body()!!.string()).getJSONArray("images")
                    val markerJson = JSONObject(markerResponse.body()!!.string()).getJSONArray("locations")

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
                            //photoAtCurrentMarker = arrayListOf()
                        ))
                    }


                    for(i in 0 until photoJsonArr.length()){
                        val imageObject = photoJsonArr.getJSONObject(i)
                        val imageUrl = imageObject.getString("presignedUrl")
                        val time = Instant.parse(imageObject.getString("timestamp"))
                        val photo = PhotoInstance(
                            imageURL = imageUrl,
                            time = time
                        )
                        mapContent.imageList.add(photo)
                        /*
                        val location = imageObject.getJSONObject("location").getJSONObject("position")
                        val lat = location.getDouble("lat")
                        val lng = location.getDouble("lng")
                        for(i in 0 until mapContent.markerList.size){
                            if(lat == mapContent.markerList[i].lat && lng == mapContent.markerList[i].lng){
                                mapContent.markerList[i].photoAtCurrentMarker.add(photo)
                            }
                        }

                         */
                    }
                    Log.d(TAG,  mapContent.markerList.toString())
                    Log.d(TAG,  mapContent.imageList.toString())
                    Log.d(TAG,  photoJsonArr.toString())
                    Log.d(TAG, markerJson.toString())

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
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
import okhttp3.ResponseBody
import org.json.JSONArray
import org.json.JSONObject
import retrofit2.Response
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
                    RetrofitClient.apiUser.getMarkerByUser(userToken)
                }

                val friendsResponse =  withContext(Dispatchers.IO) {
                    RetrofitClient.apiUser.getFriendsByUser(userToken)
                }

                if(friendsResponse.isSuccessful && friendsResponse.body() != null){
                    Log.d(TAG,  "Tiggers")
                    val friendsList = JSONObject(friendsResponse.body()!!.string()).optJSONArray("friends") ?: JSONArray()
                    for(i in 0 until friendsList.length()){
                        userInfo.friends.add(friendsList.optString(i))
                    }
                }
                val isPhotoResponseValid = photoResponse.isSuccessful && photoResponse.body() != null
                val isMarkerResponseValid = markerResponse.isSuccessful && markerResponse.body() != null
                if(isPhotoResponseValid && isMarkerResponseValid){

                    mapContentInit(photoResponse,markerResponse)

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
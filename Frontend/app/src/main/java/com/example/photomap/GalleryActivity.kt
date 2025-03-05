package com.example.photomap

import android.content.Intent

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.example.photomap.ui.theme.PhotoMapTheme

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import coil.compose.rememberImagePainter

import androidx.compose.ui.text.font.FontWeight

import androidx.compose.ui.unit.sp



class GalleryActivity : ComponentActivity() {

    private var userToken: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        userToken = getSharedPreferences("UserPrefs", MODE_PRIVATE).getString("user_token", null)
        if (userToken == null) {
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
            finish()
        }
        enableEdgeToEdge()
        setContent {
            GalleryScreen()
        }
    }


    @Composable
    fun GalleryScreen() {
        val imageGroups: MutableMap<String, MutableList<String>> = mutableMapOf()
        for(i in 0 until MainActivity.mapContent.markerList.size){
            val imageArr: MutableList<String> = mutableListOf()
            for (j in 0 until MainActivity.mapContent.markerList[i].photoAtCurrentMarker.size){
                imageArr.add(MainActivity.mapContent.markerList[i].photoAtCurrentMarker[j].imageURL)
            }
            imageGroups[MainActivity.mapContent.markerList[i].title] = imageArr
        }

        Gallery(imageGroups)
    }

    @Composable
    fun Gallery(imageGroups: Map<String, List<String>>) {
        val screenWidth = LocalConfiguration.current.screenWidthDp.dp
        val imageSize = screenWidth / 3

        LazyColumn(modifier = Modifier.fillMaxSize()) {

            item {
                Spacer(modifier = Modifier.height(40.dp))
            }

            imageGroups.forEach { (category, imageUrls) ->
                item {
                    Text(
                        text = category,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp, horizontal = 16.dp)
                    )
                }

                items(imageUrls.chunked(3)) { rowImages ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        for (imageUrl in rowImages) {
                            Image(
                                painter = rememberImagePainter(imageUrl),
                                contentDescription = "Gallery Image",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .width(imageSize)
                                    .height(imageSize)
                                    .padding(2.dp)
                            )
                        }
                        repeat(3 - rowImages.size) {
                            Spacer(modifier = Modifier.width(imageSize).height(imageSize).padding(2.dp))
                        }
                    }
                }
            }
        }
    }




}
package com.example.photomap

import android.content.Intent

import android.os.Bundle
import android.util.Log
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




import androidx.compose.foundation.gestures.detectTapGestures

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.painterResource
import coil.compose.AsyncImage

import kotlinx.coroutines.launch

import coil.compose.rememberImagePainter




class GalleryActivity : ComponentActivity() {

    private var userToken: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)


        userToken = getSharedPreferences("UserPrefs", MODE_PRIVATE).getString("user_token", null)
        //Log.d("GalleryActivity",MainActivity.mapContent.markerList.toString())
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
        val imageGroups: MutableMap<MarkerInstance, MutableList<String>> = mutableMapOf()
        for(i in 0 until MainActivity.mapContent.markerList.size){
            if(MainActivity.mapContent.markerList[i].photoAtCurrentMarker.size != 0){
                val imageArr: MutableList<String> = mutableListOf()
                for (j in 0 until MainActivity.mapContent.markerList[i].photoAtCurrentMarker.size){
                    imageArr.add(MainActivity.mapContent.markerList[i].photoAtCurrentMarker[j].imageURL)
                }
                imageGroups[MainActivity.mapContent.markerList[i]] = imageArr
            }
        }

        Gallery(imageGroups)
    }






    @Composable
    fun Gallery(imageGroups: Map<MarkerInstance, List<String>>) {
        val screenWidth = LocalConfiguration.current.screenWidthDp.dp
        val imageSize = screenWidth / 3


        var selectedImageIndex by remember { mutableStateOf<Int?>(null) }
        var selectedImages by remember { mutableStateOf<List<Pair<MarkerInstance,String>>>(emptyList()) }
        var selectedMarker by remember { mutableStateOf<List<Pair<MarkerInstance,String>>>(emptyList()) }

        LazyColumn(modifier = Modifier.fillMaxSize()) {

            item {
                Spacer(modifier = Modifier.height(40.dp))
            }

            val allImages: MutableList<Pair<MarkerInstance, String>> = mutableListOf()

            //val allImages = imageGroups.values.flatten()
            for((key, value) in imageGroups){
                for(item in value){
                    allImages.add(Pair(key, item))
                }
            }




            Log.d("GalleryActivity1",allImages.toString())
            imageGroups.forEach { (category, imageUrls) ->
                item {
                    Text(
                        text = category.title,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp, horizontal = 16.dp)
                    )
                }

                items(imageUrls.chunked(3)) { rowImages ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        var count = 0
                        for (imageUrl in rowImages) {

                            Image(
                                painter = rememberImagePainter(imageUrl),
                                contentDescription = "Gallery Image",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .width(imageSize)
                                    .height(imageSize)
                                    .padding(2.dp)
                                    .clickable {
                                        selectedImageIndex = allImages.indexOfFirst {it.second == imageUrl} // ✅ Get index from full list
                                        selectedImages = allImages // ✅ Store all images, not just row
                                        Log.d("Gallery", "Clicked Image: $imageUrl")
                                        Log.d("Gallery", "All Images: $allImages")
                                        Log.d("Gallery", "Selected Image Index: $selectedImageIndex")
                                    }

                            )
                            count++
                        }
                        repeat(3 - rowImages.size) {
                            Spacer(modifier = Modifier.width(imageSize).height(imageSize).padding(2.dp))
                        }
                    }
                }
            }
        }

        selectedImageIndex?.let { index ->
            Log.d("Gallery", "Opening Full-Screen Viewer for Index: $index")
            Log.d("Gallery", "Full-Screen Image: ${selectedImages.getOrNull(index)}")
            FullScreenImageViewer(
                images = selectedImages,
                startIndex = index,
                onDismiss = { selectedImageIndex = null }
            )
        }

    }



    @Composable
    fun FullScreenImageViewer(images: List<Pair<MarkerInstance,String>>, startIndex: Int, onDismiss: () -> Unit) {
        val pagerState = rememberPagerState( // ✅ Move pageCount inside `rememberPagerState`
            initialPage = startIndex,
            pageCount = { images.size } // ✅ Correct way in newer versions
        )
        val coroutineScope = rememberCoroutineScope()
        val spacerHeight = LocalConfiguration.current.screenHeightDp.dp * 0.2f
        Log.d("Gallery", "Opening Full-Screen Viewer at Index: $startIndex")

        Surface(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 1f))
                .pointerInput(Unit) { detectTapGestures(onTap = { onDismiss() }) },
            color = Color.Transparent
        ) {
            HorizontalPager(
                state = pagerState, // ✅ Uses state that includes page count
                modifier = Modifier.fillMaxSize()
            ) { page ->


                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(spacerHeight))
                    // The Image (Centered)
                    AsyncImage(
                        model = images[page].second,
                        contentDescription = "Full-screen image",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxWidth()
                             // Makes image take most of the space
                    )

                    // Row of Text (Directly Below Image)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.Black)
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // First Column (Left Side)
                        Column(
                            modifier = Modifier
                                .weight(4f) // Takes up available space
                                .padding(8.dp)
                        ) {
                            Text(
                                text = "Marker: ${images[page].first.title}",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold

                            )
                            Text(
                                text = "Location: ${images[page].first.location}",
                                color = Color.Gray,
                                fontSize = 14.sp
                            )
                        }

                        // Second Column (Right Side)
                        Column(
                            modifier = Modifier
                                .weight(1f) // Takes up available space
                                .padding(8.dp),
                            horizontalAlignment = Alignment.End // Aligns content to the right
                        ) {
                            Button(
                                onClick = { Log.d("Gallery", "Icon Button Clicked") },
                                modifier = Modifier.size(64.dp), // Adjust size as needed
                                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                    containerColor = Color.Transparent
                                )
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.share), // Replace with actual drawable name
                                    contentDescription = "Button Icon",
                                    modifier = Modifier.fillMaxSize() // Adjust icon size as needed
                                )
                            }
                        }
                    }
                }









            }

        }

        LaunchedEffect(pagerState.currentPage) {
            coroutineScope.launch {
                Log.d("Gallery", "Currently Viewing Image Index: ${pagerState.currentPage}")
            }
        }
    }
}
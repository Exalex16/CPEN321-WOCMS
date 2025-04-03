package com.example.photomap

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent

import android.os.Bundle
import android.util.Log
import android.widget.Toast
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
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import coil.compose.rememberImagePainter

import androidx.compose.ui.text.font.FontWeight

import androidx.compose.ui.unit.sp


import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.Surface
import androidx.compose.material3.TextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.example.photomap.MainActivity.userInfo
import com.google.gson.JsonParseException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException



@OptIn(ExperimentalMaterial3Api::class)
class GalleryActivity : ComponentActivity() {

    private var userToken: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)


        userToken = getSharedPreferences("UserPrefs", MODE_PRIVATE).getString("user_email", null)
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

        val imageGroups: MutableMap<MarkerInstance, MutableList<PhotoInstance>> = mutableMapOf()
        for(i in 0 until MainActivity.mapContent.markerList.size){
            if(MainActivity.mapContent.markerList[i].photoAtCurrentMarker.size != 0){
                val imageArr: MutableList<PhotoInstance> = mutableListOf()
                for (j in 0 until MainActivity.mapContent.markerList[i].photoAtCurrentMarker.size){
                    imageArr.add(MainActivity.mapContent.markerList[i].photoAtCurrentMarker[j])
                }
                imageGroups[MainActivity.mapContent.markerList[i]] = imageArr
            }
        }
        Gallery(imageGroups)
    }

    @OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterialApi::class)
    @Composable
    fun Gallery(imageGroups: MutableMap<MarkerInstance, MutableList<PhotoInstance>>) {
        val screenWidth = LocalConfiguration.current.screenWidthDp.dp
        val imageSize = screenWidth / 3
        var selectedImageIndex by remember { mutableStateOf<Int?>(null) }
        var selectedImages by remember { mutableStateOf<List<Pair<MarkerInstance,PhotoInstance>>>(emptyList()) }
        var isRefreshing by remember { mutableStateOf(false) }
        val refreshScope = rememberCoroutineScope()
        val allImages: MutableList<Pair<MarkerInstance, PhotoInstance>> = mutableListOf()
        for ((key, value) in imageGroups) {
            for (item in value) {
                allImages.add(Pair(key, item))
            }
        }
        val context = LocalContext.current

        fun refreshGallery() {
            refreshScope.launch {
                isRefreshing = true
                delay(1000) // Simulate API refresh or data reload
                val photoResponse = withContext(Dispatchers.IO) {
                    RetrofitClient.api.getImagesByUser(userToken.toString())
                }
                val markerResponse =  withContext(Dispatchers.IO) {
                    RetrofitClient.apiUser.getMarkerByUser(userToken.toString())
                }

                val friendsResponse =  withContext(Dispatchers.IO) {
                    RetrofitClient.apiUser.getFriendsByUser(userToken.toString())
                }

                if(friendsResponse.isSuccessful && friendsResponse.body() != null){
                    val friendsList = JSONObject(friendsResponse.body()!!.string()).optJSONArray("friends") ?: JSONArray()
                    userInfo.friends.clear()
                    for(i in 0 until friendsList.length()){
                        userInfo.friends.add(friendsList.optString(i))
                    }
                }
                val isPhotoResponseValid = photoResponse.isSuccessful && photoResponse.body() != null
                val isMarkerResponseValid = markerResponse.isSuccessful && markerResponse.body() != null
                if(isPhotoResponseValid && isMarkerResponseValid){
                    for (marker in MainActivity.mapContent.markerList) {
                        marker.drawnMarker!!.remove()
                        marker.drawnMarker = null
                    }
                    mapContentInit(photoResponse,markerResponse)
                }
                Log.d("Gallery", "Refresh triggered")
                Log.d("Gallery", MainActivity.mapContent.markerList.toString())
                Log.d("Gallery", MainActivity.mapContent.imageList.toString())


                imageGroups.clear()
                for(i in 0 until MainActivity.mapContent.markerList.size){
                    if(MainActivity.mapContent.markerList[i].photoAtCurrentMarker.size != 0){
                        val imageArr: MutableList<PhotoInstance> = mutableListOf()
                        for (j in 0 until MainActivity.mapContent.markerList[i].photoAtCurrentMarker.size){
                            imageArr.add(MainActivity.mapContent.markerList[i].photoAtCurrentMarker[j])
                        }
                        imageGroups[MainActivity.mapContent.markerList[i]] = imageArr
                    }
                }
                allImages.clear()
                for ((key, value) in imageGroups) {
                    for (item in value) {
                        allImages.add(Pair(key, item))
                    }
                }
                isRefreshing = false
                val intent = Intent("com.yourapp.ACTION_MARKERS_UPDATED")
                LocalBroadcastManager.getInstance(context).sendBroadcast(intent)
            }

        }

        val pullRefreshState = rememberPullRefreshState(isRefreshing, ::refreshGallery)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 24.dp, bottom = 50.dp) // optional outer padding

                .pullRefresh(pullRefreshState)

        ) {
            Spacer(modifier = Modifier.height(40.dp))

            Text(
                text = "Gallery",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .testTag("Title")
            )
                PullRefreshIndicator(
                    refreshing = isRefreshing,
                    state = pullRefreshState,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 2.dp)
                        .align(Alignment.CenterHorizontally)
                )

            GalleryImageGrid(
                imageGroups = imageGroups,
                imageSize = imageSize,
                allImages = allImages,
                onImageClick = { clickedIndex, all ->
                    selectedImageIndex = clickedIndex
                    selectedImages = all
                }
            )
        }
        selectedImageIndex?.let { index ->
            FullScreenImageViewer(
                images = selectedImages,
                startIndex = index,
                onDismiss = { selectedImageIndex = null }
            )
        }
    }

    @Composable
    fun GalleryImageGrid(
        imageGroups: Map<MarkerInstance, List<PhotoInstance>>,
        imageSize: Dp,
        allImages: MutableList<Pair<MarkerInstance, PhotoInstance>>,
        onImageClick: (Int, List<Pair<MarkerInstance, PhotoInstance>>) -> Unit
    ) {
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            imageGroups.forEach { (category, img) ->
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

                items(img.chunked(3)) { rowImages ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        for (image in rowImages) {
                            val index = allImages.indexOfFirst { it.second == image }
                            Image(
                                painter = rememberImagePainter(image.imageURL),
                                contentDescription = "Gallery Image",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .width(imageSize)
                                    .height(imageSize)
                                    .padding(2.dp)
                                    .clickable {
                                        onImageClick(index, allImages)
                                    }
                                    .testTag("GalleryImage_${index}")
                            )
                        }
                        repeat(3 - rowImages.size) {
                            Spacer(
                                modifier = Modifier
                                    .width(imageSize)
                                    .height(imageSize)
                                    .padding(2.dp)
                            )
                        }
                    }
                    allImages.addAll(rowImages.map { Pair(category, it) })
                }
            }
        }
    }
    @SuppressLint("UnrememberedMutableState")
    @Composable
    fun FullScreenImageViewer(images: List<Pair<MarkerInstance,PhotoInstance>>, startIndex: Int, onDismiss: () -> Unit) {
        val pagerState = rememberPagerState( // ✅ Move pageCount inside `rememberPagerState`
            initialPage = startIndex,
            pageCount = { images.size } // ✅ Correct way in newer versions
        )
        val coroutineScope = rememberCoroutineScope()
        val showDialog = remember { mutableStateOf(false) }

        Log.d("Gallery", "Opening Full-Screen Viewer at Index: $startIndex")

        Surface(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 1f))
                .pointerInput(Unit) { detectTapGestures(onTap = { onDismiss() }) }
                .testTag("FullScreenViewer"),
            color = Color.Transparent
        ) {
            HorizontalPager(
                state = pagerState, // ✅ Uses state that includes page count
                modifier = Modifier.fillMaxSize()
            ) { page ->
                val spacerHeight = LocalConfiguration.current.screenHeightDp.dp * 0.2f
                Log.d("Gallery", "sapcer height: $spacerHeight")
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(spacerHeight))
                    // The Image (Centered)
                    AsyncImage(
                        model = images[page].second.imageURL,
                        contentDescription = "Full-screen image",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("GalleryImage_${page}_full")
                             // Makes image take most of the space
                    )
                    ImageMetadataRow(
                        page = page,
                        userToken = userToken,
                        images = images,
                        showDialog = showDialog
                    )
                }
            }
        }

        if (showDialog.value) {
            DialogController(images,pagerState,coroutineScope,showDialog)
        }

        LaunchedEffect(pagerState.currentPage) {
            coroutineScope.launch {
                Log.d("Gallery", "Currently Viewing Image Index: ${pagerState.currentPage}")
            }
        }
    }



    @Composable
    fun ImageMetadataRow(
        page: Int,
        userToken: String?,
        images: List<Pair<MarkerInstance, PhotoInstance>>,
        showDialog: MutableState<Boolean>
    ) {
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
                if(!(images[page].second.sharedBy.equals("null") || images[page].second.sharedBy.equals(userToken))){
                    Text(
                        text = "SharedBy: ${images[page].second.sharedBy}",
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                }
            }
            // Second Column (Right Side)
            Column(
                modifier = Modifier
                    .weight(1f) // Takes up available space
                    .padding(8.dp),
                horizontalAlignment = Alignment.End // Aligns content to the right
            ) {
                if(!images[page].second.shared || (images[page].second.shared && images[page].second.sharedBy.equals(userToken))){
                    Button(
                        onClick = {
                            Log.d("Gallery", "Icon Button Clicked")
                            showDialog.value = true

                        },
                        modifier = Modifier.size(64.dp).testTag("IconButton"), // Adjust size as needed
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

    @Composable
    fun DialogController(images: List<Pair<MarkerInstance,PhotoInstance>>, pagerState: PagerState,coroutineScope: CoroutineScope, showDialog: MutableState<Boolean>) {
        val context = LocalContext.current
        var expanded by remember { mutableStateOf(false) }
        val options = MainActivity.userInfo.friends
        var userInput by remember { mutableStateOf("") }
            Dialog(onDismissRequest = {
                showDialog.value = false
                userInput = ""
                expanded = false
            }) {
                Box(
                    modifier = Modifier
                        .size(320.dp)
                        .background(Color.White, shape = RoundedCornerShape(16.dp))
                        .padding(10.dp)
                        .testTag("ShareDialog"),

                    ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Spacer(Modifier.height(8.dp))
                        Text("Share Photo", fontSize = 24.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.Start))
                        Spacer(Modifier.height(6.dp))



                        val dropdownState = FriendDropdownState(
                            userInput = userInput,
                            onUserInputChange = { userInput = it },
                            expanded = expanded,
                            onExpandedChange = { expanded = it },
                            context = context,
                            coroutineScope = coroutineScope,
                            userToken = userToken.toString()
                        )

                        FriendDropdownMenu(
                            state = dropdownState,
                            onAddFriend = {
                                addFriendWithFeedback(
                                    context = context,
                                    userToken = userToken.toString(),
                                    userInput = userInput
                                )
                            }
                        )
                        Spacer(Modifier.height(10.dp))
                        Text("People with Access", fontSize = 20.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.align(Alignment.Start))
                        Spacer(Modifier.height(10.dp))
                        SharedUserList(images,pagerState, coroutineScope, context)
                        Spacer(Modifier.height(30.dp))
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    shareImageWithFeedback(context, userInput, images,pagerState.currentPage,
                                        userToken.toString()
                                    )
                                }
                                showDialog.value = false
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Blue,  // Background color
                                contentColor = Color.White    // Text color
                            ),
                            modifier = Modifier.fillMaxWidth(0.3f).align(Alignment.End).testTag("ShareButton")
                        ) {
                            Text("Share", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
    }


    @Composable
    fun FriendDropdownMenu(
        state: FriendDropdownState,
        onAddFriend: suspend () -> Unit
    ) {
        val options = userInfo.friends
        ExposedDropdownMenuBox(
            expanded = state.expanded,
            onExpandedChange = { }
        ) {

            Modifier
                .menuAnchor()
                .fillMaxWidth()
                .testTag("TextInputField")
            FriendTextField(
                state = state,
                modifier = Modifier
                    .menuAnchor()
                    .fillMaxWidth()
                    .testTag("TextInputField")
            )
            ExposedDropdownMenu(
                expanded = state.expanded,
                onDismissRequest = { },
                modifier = Modifier
                    .heightIn(max = 80.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option, fontSize = 16.sp) },
                        onClick = {
                            state.onUserInputChange(option)
                            state.onExpandedChange(false)
                        },
                        modifier = Modifier.height(30.dp)
                    )
                }
                DropdownMenuItem(
                    text = { Text("Add Friend", fontSize = 16.sp) },
                    onClick = {
                        state.coroutineScope.launch {
                            if (!MainActivity.userInfo.friends.contains(state.userInput.trim())) {
                                onAddFriend()
                            } else {
                                Toast.makeText(state.context, "The person is already your friend", Toast.LENGTH_SHORT).show()
                            }
                            state.onExpandedChange(false)
                        }
                    },
                    modifier = Modifier.height(30.dp)
                )
            }

        }
    }

    @Composable
    fun FriendTextField(state: FriendDropdownState,
    modifier: Modifier) {
        TextField(
            value = state.userInput,
            onValueChange = state.onUserInputChange,
            placeholder = { Text("Type email here") },
            singleLine = true,
            textStyle = TextStyle(fontSize = 16.sp),
            modifier = modifier,
            readOnly = false,
            colors = TextFieldDefaults.colors(
                unfocusedIndicatorColor = Color.Transparent,
                focusedIndicatorColor = Color.Transparent,
                disabledIndicatorColor = Color.Transparent
            ),
            trailingIcon = {
                IconButton(onClick = { state.onExpandedChange(!state.expanded) }) {
                    Icon(
                        imageVector = if (state.expanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                        contentDescription = "Dropdown Arrow",
                        tint = Color.Black
                    )
                }
            }
        )
    }



    @Composable
    fun SharedUserList(
        images: List<Pair<MarkerInstance,PhotoInstance>>,
        pagerState: PagerState,
        coroutineScope: CoroutineScope,
        context: Context,

    ) {
        val selectedIndex = remember { mutableStateOf<Int?>(null) }

        Box(
            modifier = Modifier
                .height(96.dp)
                .fillMaxWidth()
                .then(if (images[pagerState.currentPage].second.sharedTo.size > 3) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                .background(Color(0xFFf2f3f4))
                .padding(8.dp)
        ) {
            Column {
                repeat(images[pagerState.currentPage].second.sharedTo.size) { index ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable {
                                selectedIndex.value = if (selectedIndex.value == index) null else index
                            },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = images[pagerState.currentPage].second.sharedTo[index],
                            fontSize = 16.sp,
                            modifier = Modifier
                                .weight(1f)
                                .testTag("shareText_${index}")
                        )
                        Log.d("DialogInput", "shareText_${index}")
                        if (selectedIndex.value == index) {
                            IconButton(
                                onClick = {
                                    coroutineScope.launch {
                                        cancelShareWithFeedback(context, selectedIndex.value!!, images, pagerState.currentPage, userToken.toString())
                                        selectedIndex.value = null
                                    }
                                },
                                modifier = Modifier.size(16.dp)

                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete",
                                    tint = Color.Red,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
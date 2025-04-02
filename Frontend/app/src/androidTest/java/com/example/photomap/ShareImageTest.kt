import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.rules.ActivityScenarioRule
import com.example.photomap.GalleryActivity
import com.example.photomap.ApiService
import com.example.photomap.MainActivity
import com.example.photomap.UploadResponse
import kotlinx.coroutines.runBlocking
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import org.junit.*

import com.example.photomap.PhotoInstance
import com.example.photomap.MarkerInstance
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import retrofit2.Response
import com.example.photomap.RetrofitClient
import java.time.Instant


class ShareImageTest{

    private lateinit var scenario: ActivityScenario<GalleryActivity>

    @get:Rule
    val composeTestRule = createAndroidComposeRule<GalleryActivity>()

    @Before
    fun setUp() = runBlocking {
        Log.d("Testing", "Setting up before launching GalleryActivity...")
        val context = ApplicationProvider.getApplicationContext<Context>()
        val prefs = context.getSharedPreferences("UserPrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("user_email", "frontenduser@gmail.com").apply()
        try {
            val response = uploadTestPhoto(context)
            if (response.isSuccessful) {

                Log.d("UploadTest", "Upload successful: ${response.body()?.fileName}")
                MainActivity.mapContent.imageList.clear()
                MainActivity.mapContent.markerList.clear()
                response.body()?.presignedUrl?.let {
                    response.body()!!.fileName?.let { it1 ->
                        PhotoInstance(
                            it,
                            Instant.now(),
                            it1,
                            mutableListOf(),
                            false,
                            "frontenduser@gmail.com"
                        )
                    }
                }?.let {
                    MainActivity.mapContent.imageList.add(it)
                }

                MainActivity.mapContent.markerList.add(MarkerInstance(49.26,-123.23,"UBC","Vancouver,BC","Red",
                    arrayListOf()))
                MainActivity.mapContent.markerList[0].photoAtCurrentMarker.add(MainActivity.mapContent.imageList[0])
                Log.d("Testing", MainActivity.mapContent.markerList.toString())
                Log.d("Testing", MainActivity.mapContent.imageList.toString())
            } else {
                Log.e("UploadTest", "Upload failed: ${response.errorBody()?.string()}")
            }
        } catch (e: Exception) {
            Log.e("UploadTest", "Exception during upload: ${e.message}")
        }

        // ✅ Launch the activity AFTER uploading
        scenario = ActivityScenario.launch(GalleryActivity::class.java)
    }


    @After
    fun cleanUpImages() {
        runBlocking {
            val response = RetrofitClient.api.deleteAllImages("frontenduser@gmail.com")
            if (response.isSuccessful) {
                Log.d("TestSetup", "Images deleted successfully.")
            } else {
                Log.e("TestSetup", "Failed to delete images: ${response.errorBody()?.string()}")
            }
        }
    }

    @After
    fun tearDown() {
        scenario.close()  // ✅ Ensure activity is properly closed
        Log.d("Testing", "Cleaning up after test...")
    }

    @Test
    fun testSuccessShare() {
        // ✅ Verify the activity loads correctly
        composeTestRule.onNodeWithText("Gallery").assertExists()

        composeTestRule.onNodeWithTag("GalleryImage_0").assertExists()

        composeTestRule.onNodeWithTag("GalleryImage_0").performClick()

        composeTestRule.onNodeWithTag("IconButton").assertExists()

        Thread.sleep(2000)

        composeTestRule.onNodeWithTag("IconButton").performClick()

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithTag("ShareDialog").assertExists()

        composeTestRule.onNodeWithTag("TextInputField").performTextInput("rayyu626@gmail.com")

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithTag("ShareButton").assertExists().performClick()

        Thread.sleep(1000)

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithTag("IconButton").assertExists()

        Thread.sleep(2000)

        composeTestRule.onNodeWithTag("IconButton").performClick()

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithTag("ShareDialog").assertExists()

        composeTestRule.waitForIdle()

        Thread.sleep(2000)

        composeTestRule.onNodeWithTag("shareText_0", useUnmergedTree = true).assertExists().assertTextEquals("rayyu626@gmail.com")

        Thread.sleep(2000)
    }


    @Test
    fun testShareWithInvalidInput() {
        // ✅ Verify the activity loads correctly
        composeTestRule.onNodeWithText("Gallery").assertExists()

        composeTestRule.onNodeWithTag("GalleryImage_0").assertExists()

        composeTestRule.onNodeWithTag("GalleryImage_0").performClick()

        composeTestRule.onNodeWithTag("IconButton").assertExists()

        Thread.sleep(2000)

        composeTestRule.onNodeWithTag("IconButton").performClick()

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithTag("ShareDialog").assertExists()

        composeTestRule.onNodeWithTag("TextInputField").performTextInput("xxsaSAx")

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithTag("ShareButton").assertExists().performClick()

        Thread.sleep(1000)

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithTag("IconButton").assertExists()

        Thread.sleep(2000)

        composeTestRule.onNodeWithTag("IconButton").performClick()

        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithTag("ShareDialog").assertExists()

        composeTestRule.onNodeWithTag("shareText_0").assertDoesNotExist()

        Thread.sleep(2000)
    }


    @Test
    fun testShareWithAnSharedImage() {
        // ✅ Verify the activity loads correctly
        MainActivity.mapContent.markerList[0].photoAtCurrentMarker[0].shared = true
        MainActivity.mapContent.markerList[0].photoAtCurrentMarker[0].sharedBy = "rayyu626@gmail.com"
        MainActivity.mapContent.markerList[0].photoAtCurrentMarker[0].sharedTo.add("frontenduser@gmail.com")
        composeTestRule.onNodeWithText("Gallery").assertExists()

        composeTestRule.onNodeWithTag("GalleryImage_0").assertExists()

        composeTestRule.onNodeWithTag("GalleryImage_0").performClick()

        composeTestRule.onNodeWithTag("IconButton").assertDoesNotExist()

        Thread.sleep(2000)


    }






    private suspend fun uploadTestPhoto(context: Context): Response<UploadResponse> {
        val fakeUri = Uri.parse("android.resource://com.example.photomap/drawable/restaurant")
        val description = "This is a test description".toRequestBody("text/plain".toMediaTypeOrNull())
        val uploader = "frontenduser@gmail.com".toRequestBody("text/plain".toMediaTypeOrNull())
        val locationJson = JSONObject().apply {
            put("position", JSONObject().apply {
                put("lat", 49.26)
                put("lng", -123.23)
            })
            put("title", "UBC")
            put("location", "Vancouver,BC")
            put("icon", "Red")
        }.toString()
        val location = locationJson.toRequestBody("application/json".toMediaTypeOrNull())
        val imagePart = createImagePartFromResource(context,fakeUri!!)

         val response = RetrofitClient.api.uploadPhoto(image=imagePart,
            description = description,
            uploader = uploader,
            location = location,
         )

        Log.d("UploadTest", "Upload successful: ${response.body()}")
        return response
    }

    private fun createImagePartFromResource(context: Context, uri: Uri): MultipartBody.Part {
        // Open the resource InputStream
        val inputStream = context.contentResolver.openInputStream(uri) ?: throw IllegalStateException("Unable to open image")

        val fileBytes = inputStream.readBytes()
        inputStream.close()

        // Create RequestBody for the image
        val requestFile = fileBytes.toRequestBody("image/*".toMediaTypeOrNull())

        Log.d("Testing", MultipartBody.Part.createFormData(
            "image",
            "filename",
            requestFile
        ).toString())

        // Wrap it in MultipartBody.Part with form field name "image"
        return MultipartBody.Part.createFormData(
            "image",
            "filename",
            requestFile
        )
    }
}

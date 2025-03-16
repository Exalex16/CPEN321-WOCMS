package com.example.photomap

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityOptionsCompat
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onData
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import org.hamcrest.CoreMatchers.instanceOf
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.Matchers.allOf
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

import androidx.test.uiautomator.UiDevice
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.espresso.matcher.RootMatchers.isDialog
import androidx.test.espresso.matcher.RootMatchers.isPlatformPopup
import androidx.test.espresso.matcher.ViewMatchers
import androidx.test.espresso.matcher.ViewMatchers.withEffectiveVisibility
import kotlinx.coroutines.runBlocking
import org.hamcrest.CoreMatchers.containsString
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.DELETE
import retrofit2.http.Path


@RunWith(AndroidJUnit4::class)
@LargeTest
class RecommendationTest {

    private lateinit var scenario: ActivityScenario<MapsActivity>
    private val retrofit = Retrofit.Builder()
        .baseUrl("https://wocmpphotomap.com/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val photoApi = retrofit.create(PhotoApi::class.java)

    @get:Rule
    val activityRule = ActivityScenarioRule(MapsActivity::class.java)

    @Before
    fun setUp() {

        // 1. Set user email in SharedPreferences
        val context = ApplicationProvider.getApplicationContext<Context>()
        val prefs = context.getSharedPreferences("UserPrefs", Context.MODE_PRIVATE)
        prefs.edit().putString("user_email", "frontenduser@gmail.com").apply()

        // 2. Launch the activity
        scenario = ActivityScenario.launch(MapsActivity::class.java)

        // 3. Override pickImageLauncher with a fake launcher
        scenario.onActivity { activity ->

            // Create a test double that simulates picking an image
            val fakeLauncher = object : ActivityResultLauncher<String>() {
                override fun launch(input: String, options: ActivityOptionsCompat?) {
                    // Immediately simulate the user picking a "test.jpg"
                    val fakeUri = Uri.parse("android.resource://com.example.photomap/drawable/restaurant")
                    // Simulate the inline lambda from your production code:
                    activity.selectedImageUri = fakeUri
                }
                override fun unregister() {
                    // No-op for testing purposes
                }
                override val contract: ActivityResultContract<String, *>
                    get() = ActivityResultContracts.GetContent()
            }

            // Replace the real launcher with our fake launcher.
            activity.pickImageLauncherTest = fakeLauncher
        }
    }

    @Before
    fun cleanUpImages() {
        runBlocking {
            val response = photoApi.deleteAllImages("frontenduser@gmail.com")
            if (response.isSuccessful) {
                Log.d("TestSetup", "Images deleted successfully.")
            } else {
                Log.e("TestSetup", "Failed to delete images: ${response.errorBody()?.string()}")
            }
        }
    }

    @After
    fun tearDown() {
        scenario.close()
    }

    @Test
    fun testRawClickRecommend(){
        onView(withId(R.id.recommendation))
            .check(matches(isDisplayed()))
            .perform(click())

        Thread.sleep(1000)

        onView(withId(com.google.android.material.R.id.snackbar_text))
            .check(matches(withText("No recommendation available! Insufficient images or markers.")))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testSuccessfulRecommendWithMatch() {
        // Add a marker for upload test
        simulateScreenTap(1000, 1400)

        onView(withId(R.id.markerTitle))
            .inRoot(isDialog())
            .perform(typeText("Test Marker"), closeSoftKeyboard())

        onView(withId(R.id.colorSpinner))
            .inRoot(isDialog())
            .perform(click())
        onData(allOf(`is`(instanceOf(String::class.java)), `is`("Red")))
            .inRoot(isPlatformPopup())   // Use isPlatformPopup() for the spinner dropdown
            .perform(click())

        onView(withText("Add"))
            .inRoot(isDialog())
            .perform(click())

        Thread.sleep(1000)

        // 7. Click the center of the screen to open title of marker.
        simulateScreenTap(540, 1200)

        Thread.sleep(1000)

        //    b) Tap the upload photo button (ensure its ID is set correctly)
        onView(withId(R.id.fab_actions))
            .check(matches(isDisplayed()))
            .perform(click())

        //    c) Bottom sheet should appear; click "Pick Photo" to trigger the fake launcher
        onView(withId(R.id.btn_pick_photo))
            .check(matches(isDisplayed()))
            .perform(click())

        Thread.sleep(1000)

        // 4. Press "Submit" to upload
        onView(withId(R.id.btn_submit_upload))
            .perform(click())

        Thread.sleep(3000)

        // 5. Verify success message (e.g., via Snackbar)
        onView(withId(com.google.android.material.R.id.snackbar_text))
            .check(matches(withText("Upload Successful!")))
            .check(matches(isDisplayed()))

        Thread.sleep(1000)

        // Click Recommendation
        onView(withId(R.id.recommendation))
            .check(matches(isDisplayed()))
            .perform(click())

        Thread.sleep(1000)

        // 2. Check that the summary TextView is displayed.
        onView(withId(R.id.tvSummary))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))
            .check(matches(withText(containsString("You appear to be most active around"))))

        // 3. Verify the RecyclerView is visible and the “No places” message is hidden.
        onView(withId(R.id.rvSuggestedPlaces))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))
        onView(withId(R.id.tvNoPlacesMessage))
            .inRoot(isDialog())
            .check(matches(withEffectiveVisibility(ViewMatchers.Visibility.GONE)))

        simulateScreenTap(500, 1500)

        Thread.sleep(1000)

        onView(withId(com.google.android.material.R.id.snackbar_text))
            .check(matches(withText("Add Recommendation Marker Successful!")))
            .check(matches(isDisplayed()))

        // 6. The bottom sheet should dismiss. Check that the summary is gone:
        onView(withId(R.id.tvSummary))
            .check(doesNotExist())
    }

    @Test
    fun testSuccessfulRecommendWithNoMatch() {

        scenario.onActivity { activity ->
            activity.centerMapOn(-21.2554, -55.2487, 15f) // Africa
        }

        // Add a marker for upload test
        simulateScreenTap(1000, 1400)

        onView(withId(R.id.markerTitle))
            .inRoot(isDialog())
            .perform(typeText("Test Marker"), closeSoftKeyboard())

        onView(withId(R.id.colorSpinner))
            .inRoot(isDialog())
            .perform(click())
        onData(allOf(`is`(instanceOf(String::class.java)), `is`("Red")))
            .inRoot(isPlatformPopup())   // Use isPlatformPopup() for the spinner dropdown
            .perform(click())

        onView(withText("Add"))
            .inRoot(isDialog())
            .perform(click())

        Thread.sleep(1000)

        // 7. Click the center of the screen to open title of marker.
        simulateScreenTap(540, 1200)

        Thread.sleep(1000)

        //    b) Tap the upload photo button (ensure its ID is set correctly)
        onView(withId(R.id.fab_actions))
            .check(matches(isDisplayed()))
            .perform(click())

        //    c) Bottom sheet should appear; click "Pick Photo" to trigger the fake launcher
        onView(withId(R.id.btn_pick_photo))
            .check(matches(isDisplayed()))
            .perform(click())

        Thread.sleep(1000)

        // 4. Press "Submit" to upload
        onView(withId(R.id.btn_submit_upload))
            .perform(click())

        Thread.sleep(2000)

        // 5. Verify success message (e.g., via Snackbar)
        onView(withId(com.google.android.material.R.id.snackbar_text))
            .check(matches(withText("Upload Successful!")))
            .check(matches(isDisplayed()))

        Thread.sleep(1000)

        // Click Recommendation
        onView(withId(R.id.recommendation))
            .check(matches(isDisplayed()))
            .perform(click())

        Thread.sleep(1000)

        // 2. Check that the summary TextView is displayed.
        onView(withId(R.id.tvSummary))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))
            .check(matches(withText(containsString("You appear to be most active around"))))

        // 3. Verify the RecyclerView is visible and the “No places” message is hidden.
        onView(withId(R.id.tvNoPlacesMessage))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))
        onView(withId(R.id.rvSuggestedPlaces))
            .inRoot(isDialog())
            .check(matches(withEffectiveVisibility(ViewMatchers.Visibility.GONE)))
    }

    private fun simulateScreenTap(x: Int, y: Int) {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        device.click(x, y)
    }

    interface PhotoApi {
        @DELETE("image/delete-all/{email}")
        suspend fun deleteAllImages(@Path("email") email: String): Response<Unit>
    }

}

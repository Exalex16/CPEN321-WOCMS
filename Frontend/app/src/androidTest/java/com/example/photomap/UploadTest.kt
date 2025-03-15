package com.example.photomap

import android.content.Context
import android.net.Uri
import android.view.View
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
import junit.framework.TestCase.assertTrue
import androidx.test.espresso.matcher.RootMatchers.isDialog
import androidx.test.espresso.matcher.RootMatchers.isPlatformPopup


@RunWith(AndroidJUnit4::class)
@LargeTest
class UploadTest {

    private lateinit var scenario: ActivityScenario<MapsActivity>

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
                    val fakeUri = Uri.parse("android.resource://com.example.photomap/drawable/upload")
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

    @After
    fun tearDown() {
        scenario.close()
    }

    /**
     * Test that tapping the map shows the "Add Marker" dialog
     * and that the dialog's UI elements (title, spinner, buttons) are displayed.
     */
    @Test
    fun testAddMarkerDialogAppears() {
        // 1. Simulate user tapping on the map
        simulateMapClick(200, 300)

        // 2. Check that the "Add Marker" dialog is displayed
        onView(withText("Add Marker"))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))

        // 3. Check that the title EditText is displayed
        onView(withId(R.id.markerTitle))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))

        // 4. Check that the color spinner is displayed
        onView(withId(R.id.colorSpinner))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))

        // 5. Check that the "Add" and "Cancel" buttons exist
        onView(withText("Add"))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))
        onView(withText("Cancel"))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))
    }

    /**
     * Test that clicking "Cancel" dismisses the dialog without adding a marker.
     * (We are only testing UI, so we won't verify any network calls or marker lists.)
     */
    @Test
    fun testCancelButtonDismissesDialog() {
        simulateMapClick(200, 300)

        // Wait for the "Add Marker" dialog to appear in its dialog window
        onView(withText("Add Marker"))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))

        // Find and click the "Cancel" button in the dialog
        onView(withText("Cancel"))
            .inRoot(isDialog())
            .perform(click())

        // Verify the dialog is dismissed (i.e. "Add Marker" is no longer present)
        onView(withText("Add Marker"))
            .check(doesNotExist())
    }


    @Test
    fun testAddMarkerAndVerifyTitle() {

        // 1. Click on the map
        simulateMapClick(1000, 1400)

        // 2. Wait for the "Add Marker" dialog to appear
        onView(withText("Add Marker"))
            .inRoot(isDialog())
            .check(matches(isDisplayed()))

        // 3. Fill title
        onView(withId(R.id.markerTitle))
            .inRoot(isDialog())
            .perform(typeText("Test Marker"), closeSoftKeyboard())

        // 4. Select color
        onView(withId(R.id.colorSpinner))
            .inRoot(isDialog())
            .perform(click())
        onData(allOf(`is`(instanceOf(String::class.java)), `is`("Red")))
            .inRoot(isPlatformPopup())   // Use isPlatformPopup() for the spinner dropdown
            .perform(click())

        // 5. Press Add
        onView(withText("Add"))
            .inRoot(isDialog())
            .perform(click())

        // 6. Wait before interacting with the map again
        Thread.sleep(500)
        onView(withId(com.google.android.material.R.id.snackbar_text))
            .check(matches(withText("Add Marker Successful!")))
            .check(matches(isDisplayed()))

        Thread.sleep(1000)

        // 7. Click the center of the screen to open title of marker.
        simulateMapClick(540, 1200)

        // 8. Verify marker addition in MapContent.
        assertTrue("Marker not added!", MainActivity.mapContent.markerList.any { it.title == "Test Marker" })
        assertTrue("Marker color incorrect!", MainActivity.mapContent.markerList.any { it.color == "Red" })
    }
    /**
     * Helper method to simulate a map click.
     * For a pure UI test, you can:
     * - Programmatically call the code that shows the dialog, or
     * - Use a specialized approach for tapping the Google Map if necessary.
     */
    private fun simulateMapClick(x: Int, y: Int) {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        device.click(x, y)
    }


    @Test
    fun testUploadPhotoWithMockedPicker() {
        // Add a marker for upload test
        simulateMapClick(1000, 1400)

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
        simulateMapClick(540, 1200)

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
    }
}

package com.example.photomap

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.res.Resources
import android.location.Geocoder
import android.net.Uri
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.VisibleForTesting
import androidx.core.text.HtmlCompat
import androidx.lifecycle.LifecycleCoroutineScope
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.photomap.BuildConfig.MAPS_API_KEY
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.example.photomap.databinding.ActivityMapsBinding
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.time.Instant

class PhotoUploader(
    private val activity: AppCompatActivity,
    private val galleryContainer: FrameLayout,
    private val imageGalleryRecycler: RecyclerView,
    private val noImagesText: TextView
) {

    init {
        imageGalleryRecycler.layoutManager = LinearLayoutManager(activity, LinearLayoutManager.HORIZONTAL, false)
    }

    // Photo upload related state
    var selectedImageUri: Uri? = null
    var previewImageView: ImageView? = null


    // Set up image picker launcher using the Activity’s registerForActivityResult.
    // (Note: This must be initialized from an Activity/ComponentActivity.)
    var pickImageLauncher = activity.registerForActivityResult(
            ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
        previewImageView?.visibility = View.VISIBLE
        previewImageView?.setImageURI(uri)
    }

    /**
     * Displays the upload bottom sheet.
     *
     * @param currentMarker The marker to which the photo should be associated.
     * @param userEmail The email of the current user.
     * @param onUploadSuccess Callback invoked on successful upload.
     */
    fun showUploadBottomSheet(currentMarker: MarkerInstance?, userEmail: String, onUploadSuccess: () -> Unit) {
        val bottomSheetDialog = BottomSheetDialog(activity)
        val view = activity.layoutInflater.inflate(R.layout.bottom_sheet_upload, null)
        bottomSheetDialog.setContentView(view)

        val pickPhotoButton = view.findViewById<Button>(R.id.btn_pick_photo)
        val submitButton = view.findViewById<Button>(R.id.btn_submit_upload)
        val previewImageView = view.findViewById<ImageView>(R.id.imagePreview)
        this.previewImageView = previewImageView

        pickPhotoButton.setOnClickListener {
            pickImageLauncher.launch("image/*")
        }

        submitButton.setOnClickListener {
            if (selectedImageUri == null) {
                Snackbar.make(
                    activity.findViewById(android.R.id.content), // Or a specific CoordinatorLayout
                    "No image selected.",
                    Snackbar.LENGTH_SHORT
                ).show()
                bottomSheetDialog.dismiss()
                return@setOnClickListener
            }
            if (currentMarker == null) {
                Toast.makeText(activity, "No marker selected!", Toast.LENGTH_SHORT).show()
                bottomSheetDialog.dismiss()
                return@setOnClickListener
            }

            // Call the upload function with currentMarker and userEmail.
            uploadPhotoToAWS(currentMarker, userEmail) { success ->
                if (success) {
                    onUploadSuccess()
                }
            }
            bottomSheetDialog.dismiss()
        }

        bottomSheetDialog.show()
    }

    /**
     * Uploads the selected photo to AWS.
     *
     * @param currentMarker The marker to which the photo belongs.
     * @param userEmail The user's email.
     * @param onResult Callback with a Boolean indicating success.
     */
    fun uploadPhotoToAWS(currentMarker: MarkerInstance, userEmail: String, onResult: (Boolean) -> Unit) {
        activity.lifecycleScope.launch {
            try {
                val locationJson = JSONObject().apply {
                    put("position", JSONObject().apply {
                        put("lat", currentMarker.lat)
                        put("lng", currentMarker.lng)
                    })
                    put("title", currentMarker.title)
                    put("location", currentMarker.location)
                    put("icon", currentMarker.color)
                }.toString()
                val locationBody = locationJson.toRequestBody("application/json".toMediaTypeOrNull())

                val response = RetrofitClient.api.uploadPhoto(
                    image = createImagePart(selectedImageUri!!),
                    description = "This is a test description".toRequestBody("text/plain".toMediaTypeOrNull()),
                    uploader = userEmail.toRequestBody("text/plain".toMediaTypeOrNull()),
                    location = locationBody,
                    sharedTo = "[]".toRequestBody("application/json".toMediaTypeOrNull()),
                    shared = "false".toRequestBody("text/plain".toMediaTypeOrNull()),
                    sharedBy = "".toRequestBody("text/plain".toMediaTypeOrNull())
                )

                if (response.isSuccessful) {
                    val uploadData = response.body()
                    // Add the uploaded photo to the marker’s photo list.
                    currentMarker.photoAtCurrentMarker.add(
                        PhotoInstance(
                            imageURL = uploadData?.presignedUrl ?: "no url available.",
                            time = Instant.now(),
                            fileName = uploadData?.fileName ?: "no file name available.",
                            sharedTo = mutableListOf(),
                            shared = false,
                            sharedBy = null
                        )
                    )
                    currentMarker.let { markerInstance ->
                        val photos = markerInstance.photoAtCurrentMarker
                        showGallery(photos)
                    }
                    onResult(true)
                } else {
                    val errorMsg = response.errorBody()?.string()
                    Toast.makeText(activity, "Upload failed: $errorMsg", Toast.LENGTH_LONG).show()
                    onResult(false)
                }
            } catch (e: IOException) {
                e.printStackTrace()
                Toast.makeText(activity, "Network error, please check your connection.", Toast.LENGTH_SHORT).show()
                onResult(false)
            }
        }
    }

    /**
     * Creates a MultipartBody.Part from the given URI for uploading.
     */
    private fun createImagePart(uri: Uri): MultipartBody.Part {
        val inputStream = activity.contentResolver.openInputStream(uri) ?: throw IllegalStateException("Unable to open image")
        val fileBytes = inputStream.readBytes()
        inputStream.close()
        val requestFile = fileBytes.toRequestBody("image/*".toMediaTypeOrNull())
        return MultipartBody.Part.createFormData("image", "filename", requestFile)
    }

    /**
     * Displays the gallery by populating the RecyclerView.
     *
     * @param imageUrls List of PhotoInstance items representing the gallery images.
     */
    fun showGallery(imageUrls: List<PhotoInstance>) {
        if (imageUrls.isEmpty()) {
            imageGalleryRecycler.visibility = View.GONE
            noImagesText.visibility = View.VISIBLE
        } else {
            imageGalleryRecycler.visibility = View.VISIBLE
            noImagesText.visibility = View.GONE
            val urlList = imageUrls.map { it.imageURL }
            imageGalleryRecycler.adapter = GalleryAdapter(urlList)
        }
        galleryContainer.visibility = View.VISIBLE
    }

    /**
     * Hides the gallery container.
     */
    fun hideGallery() {
        galleryContainer.visibility = View.GONE
    }
}

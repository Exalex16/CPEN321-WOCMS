package com.example.photomap

import android.content.Context
import android.util.Log
import android.widget.Toast
import com.google.gson.JsonParseException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.HttpException
import java.io.IOException



suspend fun shareImageWithFeedback(
    context: Context,
    userInput: String,
    images: List<Pair<MarkerInstance, PhotoInstance>>,
    currentPage: Int,
    userToken: String
) {
    try {
        Log.d("Gallery", userToken.trim())
        Log.d("Gallery", userInput.trim())
        val response = RetrofitClient.api.shareImage(
            ShareImageRequest(
                recipientEmail = userInput.trim(),
                imageKey = images[currentPage].second.fileName,
                senderEmail = userToken.trim()
            )
        )

        if (response.isSuccessful) {
            Log.d("DialogInput", "API Success: ${response.body()?.string()}")
            images[currentPage].second.sharedTo.add(userInput.trim())
            images[currentPage].second.shared = true
            images[currentPage].second.sharedBy = userToken.trim()

            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Image is shared successfully", Toast.LENGTH_SHORT).show()
            }
        } else {
            Log.e("DialogInput", "API Error: ${response.errorBody()?.string()}")
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "The email you entered is invalid", Toast.LENGTH_SHORT).show()
            }
        }
    } catch (e: HttpException) {
        Log.e("DialogInput", "API Error ${e.code()}: ${e.message()}")
        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }
    } catch (e: JsonParseException) {
        Log.e("DialogInput", "JSON Parsing Error: ${e.message}")
        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }
    } catch (e: IOException) {
        Log.e("DialogInput", "Unexpected Error: ${e.message}")
        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }
    }
}



suspend fun cancelShareWithFeedback(
    context: Context,
    index: Int,
    images: List<Pair<MarkerInstance, PhotoInstance>>,
    currentPage: Int,
    userToken: String
) {
    try {
        Log.d("Gallery", userToken.trim())
        val response = RetrofitClient.api.cancelShare(
            cancelShareRequest(
                imageKey = images[currentPage].second.fileName,
                recipientEmail = images[currentPage].second.sharedTo[index],
                senderEmail = userToken.trim()
            )
        )

        if (response.isSuccessful) {
            Log.d("DialogInput", "API Success: ${response.body()?.string()}")
            images[currentPage].second.sharedTo.removeAt(index)
            images[currentPage].second.shared = true
            images[currentPage].second.sharedBy = userToken.trim()

            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Share is canceled successfully", Toast.LENGTH_SHORT).show()
            }
        } else {
            Log.e("DialogInput", "API Error: ${response.errorBody()?.string()}")
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Share is canceled unsuccessfully", Toast.LENGTH_SHORT).show()
            }
        }
    } catch (e: HttpException) {
        Log.e("DialogInput", "API Error ${e.code()}: ${e.message()}")
        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }
    } catch (e: JsonParseException) {
        Log.e("DialogInput", "JSON Parsing Error: ${e.message}")
        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }
    } catch (e: IOException) {
        Log.e("DialogInput", "Unexpected Error: ${e.message}")
        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }
    }
}


suspend fun addFriendWithFeedback(
    context: Context,
    userToken: String,
    userInput: String
) {
    try {

        val response = RetrofitClient.apiUser.addFriend(
            addFriendRequest(
                googleEmail = userToken.trim(), // Get current image URL
                friendEmail = userInput.trim() // Use user input as description
            )
        )

        if (response.isSuccessful) {
            Log.d("DialogInput", "API Success: ${response.body()?.string()}")
            MainActivity.userInfo.friends.add(userInput.trim())
            Log.d("friends", MainActivity.userInfo.friends.toString())
            withContext(Dispatchers.Main) { // ✅ Ensure Toast runs on the main thread
                Toast.makeText(context, "Friend is successfully added", Toast.LENGTH_SHORT).show()
            }


        } else {
            Log.e("DialogInput", "API Error: ${response.errorBody()?.string()}")
            withContext(Dispatchers.Main) { // ✅ Ensure Toast runs on the main thread
                Toast.makeText(context, "Invalid Input. Please Enter the correct user email", Toast.LENGTH_SHORT).show()
            }

        }
    }catch (e: HttpException) {
        Log.e("DialogInput", "API Error ${e.code()}: ${e.message()}") // ✅ Handles HTTP errors
        withContext(Dispatchers.Main) { // ✅ Ensure Toast runs on the main thread
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }

    } catch (e: JsonParseException) {
        Log.e("DialogInput", "JSON Parsing Error: ${e.message}") // ✅ Handles malformed JSON responses
        withContext(Dispatchers.Main) { // ✅ Ensure Toast runs on the main thread
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }

    } catch (e: IOException) {
        Log.e("DialogInput", "Network Error: ${e.message}") // ✅ Handles internet connection failures
        withContext(Dispatchers.Main) { // ✅ Ensure Toast runs on the main thread
            Toast.makeText(context, "Server Error. Please try again later", Toast.LENGTH_SHORT).show()
        }
    }
}
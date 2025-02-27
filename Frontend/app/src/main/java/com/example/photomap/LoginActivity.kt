package com.example.photomap

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.util.UUID
import androidx.lifecycle.lifecycleScope


class LoginActivity : AppCompatActivity() {
    companion object{
        private const val TAG = "MainActivity"
    }
    private val activityScope = CoroutineScope(Dispatchers.Main)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContentView(R.layout.activity_login)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.login_button)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        findViewById<ImageButton>(R.id.login_button).setOnClickListener{
            Log.d(TAG,"Sign in button clicked")
            Log.d(TAG,"web client ID: ${BuildConfig.WEB_CLIENT_ID}")
            val credentialManager = CredentialManager.create(this)
            val signInWithGoogleOption: GetSignInWithGoogleOption = GetSignInWithGoogleOption.Builder(BuildConfig.WEB_CLIENT_ID)
                .setNonce(generateHashedNonce())
                .build()

            val request: GetCredentialRequest = GetCredentialRequest.Builder()
                .addCredentialOption(signInWithGoogleOption)
                .build()

            activityScope.launch {
                Log.d(TAG,"scope launched")
                try {
                    Log.d(TAG, "checker 1")
                    val result = credentialManager.getCredential(
                        request = request,
                        context = this@LoginActivity,
                    )
                    Log.d(TAG, "checker 2")
                    handleSignIn(result)

                } catch (e: GetCredentialException) {
                    handleFailure(e)
                }
            }
            Log.d(TAG, "Sign in finished")
        }
    }

    private fun handleFailure(e: GetCredentialException) {
        Log.e(TAG, "Error getting credential", e)
        Toast.makeText(
            this,
            "Error getting credential",
            Toast.LENGTH_SHORT
        ).show()
    }
    fun handleSignIn(result: GetCredentialResponse) {
        // Handle the successfully returned credential.
        val credential = result.credential
        println("Triggers 3")
        when (credential) {
            is CustomCredential -> {
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        // Use googleIdTokenCredential and extract id to validate and authenticate on your server.
                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)

                        Log.d(TAG, "Received Google ID token: ${googleIdTokenCredential.idToken.take(10)}")
                        lifecycleScope.launch {
                            val userPostStatus = postUser(googleIdTokenCredential.displayName.toString(), googleIdTokenCredential.id)

                            if(userPostStatus){
                                saveUserToken(googleIdTokenCredential.idToken.take(10), googleIdTokenCredential.id)
                                // ✅ Move to MainActivity
                                val intent = Intent(this@LoginActivity, MainActivity::class.java)
                                startActivity(intent)
                                finish()
                            }

                        }


                    } catch (e: GoogleIdTokenParsingException) {
                        Log.e(TAG, "Received an invalid Google ID token response", e)
                    }
                } else {
                    // Catch any unrecognized credential type here.
                    Log.e(TAG, "Unexpected type of credential")
                }
            }
            else -> {
                // Catch any unrecognized credential type here.
                Log.e(TAG, "Unexpected type of credential")
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }

    private fun generateHashedNonce(): String {
        val rawNonce = UUID.randomUUID().toString()
        val bytes = rawNonce.toByteArray()
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(bytes)
        return digest.fold("") { str, it -> str + "%02x".format(it) }
    }

    private fun saveUserToken(token: String, email: String) {
        val sharedPreferences = getSharedPreferences("UserPrefs", MODE_PRIVATE)
        val editor = sharedPreferences.edit()
        editor.putString("user_token", token)
        editor.putString("user_email", email)
        editor.apply()
    }
    private suspend fun postUser(name: String, email: String): Boolean {

        try {
            RetrofitClient.api.createUser(UserPostRequest(email,name))
            println("✅ User created successfully!")
            return true
        } catch (e: Exception) {
            println("❌ User creation failed: ${e.message}")
            return false
        }
    }






}
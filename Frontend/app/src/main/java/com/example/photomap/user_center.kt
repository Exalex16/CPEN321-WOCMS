package com.example.photomap


import android.app.Activity
import android.content.Context
import android.content.Intent
import android.view.View
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex



@Composable
fun UserCenterOverlay(
    context: Context,
    showOverlay: Boolean,
    onClose: () -> Unit
) {
    if (showOverlay) {
        BackHandler(enabled = true) {
        }
        UserCenterContent(context = context, onClose = onClose)
    }
}


fun showUserCenterOverlay(composeView: ComposeView) {
    composeView.setContent {
        UserCenterOverlay(
            context = LocalContext.current,
            showOverlay = true,
            onClose = { composeView.visibility = View.GONE }
        )
    }
    composeView.visibility = View.VISIBLE
}

@Composable
fun UserCenterContent(
    context: Context,
    onClose: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xAA000000)) // dark transparent background
            .zIndex(1f)
            .pointerInput(Unit) {
                detectTapGestures(onTap = { onClose() }) // dismiss on outside tap
            },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .width((LocalConfiguration.current.screenWidthDp * 0.6).dp)
                .background(Color.White, shape = RoundedCornerShape(12.dp))
                .padding(12.dp)
                .pointerInput(Unit) {} // prevents click-through
        ) {
            Text(
                text = "User",
                fontSize = 24.sp,
                color = Color.Black,
                modifier = Modifier
                    .padding(bottom = 16.dp)
                    .fillMaxWidth()
            )

            Text(
                text = context.getSharedPreferences("UserPrefs", Context.MODE_PRIVATE)
                    .getString("user_email", null) ?: "No Email",
                fontSize = 18.sp,
                color = Color.Black,
                modifier = Modifier
                    .padding(bottom = 16.dp)
                    .fillMaxWidth()
            )

            Button(
                onClick = {
                    context.getSharedPreferences("UserPrefs", Context.MODE_PRIVATE)
                        .edit().clear().apply()
                    onClose()
                    val intent = Intent(context, MainActivity::class.java)
                    (context as? Activity)?.startActivity(intent)
                    (context as? Activity)?.finish()
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RectangleShape,
                colors = ButtonDefaults.buttonColors(Color.Red)
            ) {
                Text("Log Out")
            }
        }
    }
}




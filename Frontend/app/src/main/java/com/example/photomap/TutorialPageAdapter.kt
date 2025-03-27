package com.example.photomap

import android.app.Dialog
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.ImageButton
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2

class TutorialPagerAdapter(private val layoutIds: List<Int>) :
    RecyclerView.Adapter<TutorialPagerAdapter.TutorialViewHolder>() {

    inner class TutorialViewHolder(val view: View) : RecyclerView.ViewHolder(view)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TutorialViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(viewType, parent, false)
        return TutorialViewHolder(view)
    }

    override fun onBindViewHolder(holder: TutorialViewHolder, position: Int) {
        // Nothing extra needed if the page layouts are static.
    }

    override fun getItemCount(): Int = layoutIds.size

    override fun getItemViewType(position: Int): Int {
        return layoutIds[position]
    }
}

class TutorialDialogFragment : DialogFragment() {

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        // Create a full-screen dialog without title.
        // Use the custom theme
        val dialog = Dialog(requireContext(), R.style.Theme_TransparentDialog)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setContentView(R.layout.tutorial_overlay)

        // Set up ViewPager2
        val viewPager = dialog.findViewById<ViewPager2>(R.id.tutorialViewPager)
        // List of tutorial page layouts
        val pageLayouts = listOf(
            R.layout.tutorial_page1,
            R.layout.tutorial_page2,  // create these XMLs similarly
        )
        val adapter = TutorialPagerAdapter(pageLayouts)
        viewPager.adapter = adapter

        // Set up the close button
        val closeButton = dialog.findViewById<ImageButton>(R.id.btnClose)
        closeButton.setOnClickListener {
            Log.d("TutorialDialogFragment", "Close button clicked")
            dismiss()
        }
        return dialog
    }
}

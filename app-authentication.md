---
layout: page
title: App Authentication Overview
permalink: https://boutique-piyay.netlify.app/app-authentication/ 
---

<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: auto; padding: 20px;">

    <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">RIVAYO REWARDS - Authentication Overview</h2>

    <section>
        <h3>1. Purpose of Authentication</h3>
        <p>RIVAYO REWARDS is a reward-based gaming application. Authentication is mandatory to:</p>
        <ul>
            <li>Securely track and save each user's unique progress, points, and earnings.</li>
            <li>Prevent fraud and ensure rewards are distributed to the rightful account owner.</li>
            <li>Enable seamless data synchronization across multiple devices.</li>
        </ul>
    </section>

    <section style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 5px solid #3498db; margin: 20px 0;">
        <h3>2. Authentication Methods</h3>
        <p>The app uses <strong>Firebase Authentication</strong> to provide two secure methods:</p>
        <ul>
            <li><strong>Email and Password:</strong> Standard registration and login.</li>
            <li><strong>Google Sign-In:</strong> Fast, one-tap authentication.</li>
        </ul>
    </section>

    <section>
        <h3>3. User Journey</h3>
        <ul>
            <li><strong>Launch:</strong> Unauthenticated users start at the Login Screen.</li>
            <li><strong>Registration:</strong> New users can create accounts on the Register Screen.</li>
            <li><strong>Access:</strong> Once logged in, a unique UID is retrieved, granting access to the Home Screen to play games and view rewarded ads.</li>
        </ul>
    </section>

    <section>
        <h3>4. Data Security & Privacy</h3>
        <p>All credentials are handled via Firebase. We comply with Google Play's data safety policies, allowing users to delete their accounts and data directly within the app settings.</p>
    </section>

    <hr style="border: 0; height: 1px; background: #eee; margin: 30px 0;">

    <section style="background-color: #e8f4fd; padding: 20px; border: 1px dashed #3498db; border-radius: 10px;">
        <h3 style="color: #2980b9; margin-top: 0;">5. Instructions for Reviewers (Test Credentials)</h3>
        <p>To review the ad implementation and internal features, please use these credentials:</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px; font-weight: bold; width: 150px;">Test Email:</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #ccc;">testuser@example.com</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Test Password:</td>
                <td style="padding: 10px; background: #fff; border: 1px solid #ccc;">password123</td>
            </tr>
        </table>
        <p style="font-size: 0.9em; color: #666; margin-top: 15px;">
            <em>Note: This account is active in our Firebase Console for testing purposes.</em>
        </p>
    </section>

</div>
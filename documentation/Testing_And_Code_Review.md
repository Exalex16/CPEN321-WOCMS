# Example M5: Testing and Code Review

## 1. Change History

| **Change Date**   | **Modified Sections** | **Rationale** |
| ----------------- | --------------------- | ------------- |
| _Nothing to show_ |

---

## 2. Back-end Test Specification: APIs

### 2.1. Locations of Back-end Tests and Instructions to Run Them

#### 2.1.1. Tests

| **Interface**                 | **Describe Group Location, No Mocks**                | **Describe Group Location, With Mocks**            | **Mocked Components**              |
| ----------------------------- | ---------------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| **POST /upload** | [`backend/tests/unmocked/imageNM.test.ts#L35`](#) | [`backend/tests/mocked/imageM.test.ts#L65`](#) | User DB, Image DB, AWS S3, sharp, S3 presign URL |
| **GET /metadata/:key** | [`backend/tests/unmocked/imageNM.test.ts#L150`](#) | [`backend/tests/mocked/imageM.test.ts#L233`](#) | Image DB, AWS S3 |
| **GET /images/uploader/:uploaderEmail** | [`backend/tests/unmocked/imageNM.test.ts#L172`](#) | [`backend/tests/mocked/imageM.test.ts#L280`](#) | User DB, AWS S3 |
| **GET /images** | [`backend/tests/unmocked/imageNM.test.ts#L195`](#) | [`backend/tests/mocked/imageM.test.ts#L366`](#) | Image DB, AWS S3 |
| **PUT /image/update-description** | [`backend/tests/unmocked/imageNM.test.ts#L207`](#) | [`backend/tests/mocked/imageM.test.ts#L410`](#) | Image DB |
| **POST /image/share** | [`backend/tests/unmocked/imageNM.test.ts#L249`](#) | [`backend/tests/mocked/imageM.test.ts#L483`](#) | Image DB |
| **GET /image/shared/:userEmail** | [`backend/tests/unmocked/imageNM.test.ts#L353`](#) | [`backend/tests/mocked/imageM.test.ts#L510`](#) | Image DB, AWS S3 |
| **POST /image/cancel-share** | [`backend/tests/unmocked/imageNM.test.ts#L368`](#) | [`backend/tests/mocked/imageM.test.ts#L554`](#) | Image DB |
| **DELETE /image/:key** | [`backend/tests/unmocked/imageNM.test.ts#L434`](#) | [`backend/tests/mocked/imageM.test.ts#L328`](#) | Image DB, AWS S3 |
| **DELETE /image/delete-all/:userEmail** | [`backend/tests/unmocked/imageNM.test.ts#L457`](#) | [`backend/tests/mocked/imageM.test.ts#L440`](#) | Image DB, User DB, AWS S3 |
| **POST /user** | [`backend/tests/unmocked/userNM.test.ts#L24`](#) | [`backend/tests/mocked/userM.test.ts#L37`](#) | User DB |
| **GET /user/:googleEmail** | [`backend/tests/unmocked/userNM.test.ts#L76`](#) | [`backend/tests/mocked/userM.test.ts#L59`](#) | User DB |
| **PUT /user/:googleEmail** | [`backend/tests/unmocked/userNM.test.ts#L102`](#) | [`backend/tests/mocked/userM.test.ts#L79`](#) | User DB |
| **GET /users** | [`backend/tests/unmocked/userNM.test.ts#L176`](#) | [`backend/tests/mocked/userM.test.ts#L101`](#) | User DB |
| **POST /user/:googleEmail/location** | [`backend/tests/unmocked/userNM.test.ts#L192`](#) | [`backend/tests/mocked/userM.test.ts#L141`](#) | User DB |
| **POST /user/add-friend** | [`backend/tests/unmocked/userNM.test.ts#L267`](#) | [`backend/tests/mocked/userM.test.ts#L163`](#) | User DB |
| **GET /user/:googleEmail/friends** | [`backend/tests/unmocked/userNM.test.ts#L340`](#) | [`backend/tests/mocked/userM.test.ts#L185`](#) | User DB |
| **POST /user/delete-friend** | [`backend/tests/unmocked/userNM.test.ts#L367`](#) | [`backend/tests/mocked/userM.test.ts#L205`](#) | User DB |
| **DELETE /user/:googleEmail** | [`backend/tests/unmocked/userNM.test.ts#L432`](#) | [`backend/tests/mocked/userM.test.ts#L121`](#) | User DB |
| **GET /map/popular-locations/:userEmail** | [`backend/tests/unmocked/mapNM.test.ts#L432`](#) | [`backend/tests/mocked/mapM.test.ts#L121`](#) [`backend/tests/mocked/mapM_specialReturn.test.ts#L121`](#) | Image DB |


#### 2.1.2. Commit Hash Where Tests Run

`[Insert Commit SHA here]`

#### 2.1.3. Explanation on How to Run the Tests

1. **Clone the Repository**:

   - Open your terminal and run:
     ```
     git clone https://github.com/cpen321-wocms/CPEN321-WOCMS.git
     ```

2. **Move to Backend Folder**
    -Run following code in terminal (Windows user)
     ```
     cd .\CPEN321-WOCMS\backend
     ```
    
3. **Install Dependencies**
    - In the backend folder run
     ```
     npm install
     ```

4. **Run Test For All**
    - Run following commend for all the test
     ```
     npm test
     ```

5. **(Optional) Run Test For Without Mocking**
    - Run 
     ```
     npm test tests/unmocked
     ```

5. **(Optional) Run Test For With Mocking**
    - Run 
     ```
     npm test tests/mocked
     ```

### 2.2. GitHub Actions Configuration Location

`~/.github/workflows/test.yml`

### 2.3. Jest Coverage Report Screenshots With Mocks

<img src="images/BackendTestM.png" alt="Alt text" width="500">
  
  - Line that not corvered in services.ts is the environment variable check, run acitivite if there is no environment variable
  - The two lines in index.ts is the 400 route validation check. Since our route did not have validation check, so it won't activite. It is copied from tutorial video, and keep for furture. Instead of validation check, we check input in each controller with 404 or 403 status.

### 2.4. Jest Coverage Report Screenshots Without Mocks

_<img src="images/BackendTestNM.png" alt="Alt text" width="500">_

---

## 3. Back-end Test Specification: Tests of Non-Functional Requirements

### 3.1. Test Locations in Git

| **Non-Functional Requirement**  | **Location in Git**                              |
| ------------------------------- | ------------------------------------------------ |
| **Photo Gallery Upload Speed (Response Time)** | [`tests/NonFunctional/uploadspeed.test.js`](#) |
| **Chat Data Security**          | [`tests/nonfunctional/chat_security.test.js`](#) |

### 3.2. Test Verification and Logs

- **Photo Gallery Upload Speed (Response Time)**

  - **Verification:** This test suite simulates multiple concurrent API calls using Jest to mimic real-world user behavior. The focus is on key endpoints that user create two location markers and upload one phtot to each marker. The test logs capture the general upload speed of photo from API call to backend server, label analyze, and S3 cloud. These logs shows the performence of our backend logic. Also, the Jest describe has a 6s timeout. If the test running time exceed 6s, it will fail automatically. 
  - **Log Output**
    ```
    POST /user 200 69 - 50.170 ms
    PUT /user/exalex16@gmail.com 200 245 - 13.653 ms
    PUT /user/exalex16@gmail.com 200 239 - 6.264 ms
    POST /upload 200 1027 - 2019.652 ms
    POST /upload 200 1033 - 1471.619 ms
    DELETE /image/exalex16@gmail.com-2025-03-16T19-10-15.317Z.png 200 40 - 50.583 ms
    DELETE /image/exalex16@gmail.com-2025-03-16T19-10-17.328Z.png 200 40 - 47.813 ms
    console.log

      Total Test Execution Time: 3.856s

        at tests/NonFunctional/uploadspeed.test.ts:40:13

    console.log
      Image Upload Test 1 Execution Time: 2.045s

        at tests/NonFunctional/uploadspeed.test.ts:41:13

    console.log
      Image Upload Test 2 Execution Time: 1.488s

        at tests/NonFunctional/uploadspeed.test.ts:42:13
    ```

- **Chat Data Security**
  - **Verification:** ...
  - **Log Output**
    ```
    [Placeholder for chat security test logs]
    ```

---

## 4. Front-end Test Specification

### 4.1. Location in Git of Front-end Test Suite:

`frontend/src/androidTest/java/com/studygroupfinder/`

### 4.2. Tests

- **Use Case: Login**

  - **Expected Behaviors:**
    | **Scenario Steps** | **Test Case Steps** |
    | ------------------ | ------------------- |
    | 1. The user opens â€œAdd Todo Itemsâ€ screen. | Open â€œAdd Todo Itemsâ€ screen. |
    | 2. The app shows an input text field and an â€œAddâ€ button. The add button is disabled. | Check that the text field is present on screen.<br>Check that the button labelled â€œAddâ€ is present on screen.<br>Check that the â€œAddâ€ button is disabled. |
    | 3a. The user inputs an ill-formatted string. | Input â€œ_^_^^OQ#$â€ in the text field. |
    | 3a1. The app displays an error message prompting the user for the expected format. | Check that a dialog is opened with the text: â€œPlease use only alphanumeric charactersâ€. |
    | 3. The user inputs a new item for the list and the add button becomes enabled. | Input â€œbuy milkâ€ in the text field.<br>Check that the button labelled â€œaddâ€ is enabled. |
    | 4. The user presses the â€œAddâ€ button. | Click the button labelled â€œaddâ€. |
    | 5. The screen refreshes and the new item is at the bottom of the todo list. | Check that a text box with the text â€œbuy milkâ€ is present on screen.<br>Input â€œbuy chocolateâ€ in the text field.<br>Click the button labelled â€œaddâ€.<br>Check that two text boxes are present on the screen with â€œbuy milkâ€ on top and â€œbuy chocolateâ€ at the bottom. |
    | 5a. The list exceeds the maximum todo-list size. | Repeat steps 3 to 5 ten times.<br>Check that a dialog is opened with the text: â€œYou have too many items, try completing one firstâ€. |

  - **Test Logs:**
    ```
    [Placeholder for Espresso test execution logs]
    ```

- **Use Case: ...**

  - **Expected Behaviors:**

    | **Scenario Steps** | **Test Case Steps** |
    | ------------------ | ------------------- |
    | ...                | ...                 |

  - **Test Logs:**
    ```
    [Placeholder for Espresso test execution logs]
    ```

- **...**

---

## 5. Automated Code Review Results

### 5.1. Commit Hash Where Codacy Ran

`[Insert Commit SHA here]`

### 5.2. Unfixed Issues per Codacy Category

_(Placeholder for screenshots of Codacyâ€™s Category Breakdown table in Overview)_

### 5.3. Unfixed Issues per Codacy Code Pattern

_(Placeholder for screenshots of Codacyâ€™s Issues page)_

### 5.4. Justifications for Unfixed Issues

- **Code Pattern: [@typescript eslint: No unsafe return](#)**

  1. **Unsafe return of an `any` typed value.**

     - **Location in Git:** [`backend/tests/mocked/imageM.test.ts#L12`](#)
     [`backend/tests/mocked/mapM_specialReturn.test.ts#L11`](#)
     [`backend/tests/mocked/userM.test.ts#L7`](#)
     - **Justification:** ​
        - In Jest, it's common practice to mock modules or partials by returning a custom implementation within the jest.mock function. This approach allows us to control the behavior of dependencies during testing. 
        - In Jest 29.7 Mock Functions, Mocking Partials part, it also use the same way as we did. Therefore, our jest mock is a reasonable way to use it.
        - Also, I tried many way to defined the jest, but none of my solution work. At the end, I decide to leave it like this.

- **Code Pattern: [@typescript eslint: No unsafe member access](#)**

  1. **Unsafe member access .get on an `error` typed value.**

     - **Location in Git:** Too many, most of them are locate in jest test file
     - **Justification:** ​
        - Reference to Piazza Post @181, investigation found these warnings to be potentially incorrect

- **Code Pattern: [@typescript eslint: No unsafe call](#)**

  1. **Unsafe call of an `error` type typed value.**

     - **Location in Git:** Too many, most of them are locate in jest test file
     - **Justification:** ​
        - Reference to Piazza Post @181, investigation found these warnings to be potentially incorrect

- **Code Pattern: [@typescript eslint: No unsafe assignment](#)**

  1. **Unsafe assignment of an error typed value.**

     - **Location in Git:** Too many, most of them are locate in jest test file
     - **Justification:** ​
        - Reference to Piazza Post @181, investigation found these warnings to be potentially incorrect

- **Code Pattern: [One method should have one responsibility. Long methods tend to handle many things at once. Prefer smaller methods to make them easier to understand.](#)**

  1. **The function Gallery is too long (66). The maximum length is 60.**

     - **Location in Git:** Frontend/app/src/main/java/com/example/photomap/
GalleryActivity.kt
     - **Justification:** ​
        - Gallery is a compose UI function. It can't be reduced to smaller functions otherwise the styling would be inconsistent.
  
  2. **The function FullScreenImageViewer is too long (173). The maximum length is 60.**

     - **Location in Git:** Frontend/app/src/main/java/com/example/photomap/
GalleryActivity.kt
     - **Justification:** ​
        - FullScreenImageViewer is a compose UI function. I have tried to broken this into smaller functions but result in messed up UI. It can't be reduced to smaller functions otherwise the styling would be inconsistent.

  3. **The function DialogController is too long (159). The maximum length is 60.**

     - **Location in Git:** Frontend/app/src/main/java/com/example/photomap/
GalleryActivity.kt
     - **Justification:** ​
        - DialogContoller is a compose UI function. I have tried to broken this into smaller functions but result in messed up UI. It can't be reduced to smaller functions otherwise the styling would be inconsistent.

- **Code Pattern: [Others](#)**

  1. **The function uploadPhoto(image: MultipartBody.Part, description: RequestBody, uploader: RequestBody, location: RequestBody, sharedTo: RequestBody, shared: RequestBody, sharedBy: RequestBody) has too many parameters. The current threshold is set to 6.**

     - **Location in Git:** Frontend/app/src/main/java/com/example/photomap/
ApiService.kt
     - **Justification:** ​The parameters of this function are all the necessary information of the image which can not be reduced. 
        

  



  
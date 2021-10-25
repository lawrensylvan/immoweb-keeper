# Immoweb Keeper

Save your favorite Immoweb.be search results forever in your MongoDB database and explore the past !

![Screenshot of the front-end](https://user-images.githubusercontent.com/25752900/138572515-7369734a-9727-4450-87e5-fa43db6b8b9c.png)

## Table of contents

* [Context](#context)
* [How to use](#how-to-use)
  + [Requirements](#requirements)
  + [Setup config](#setup-config)
  + [Run download routine](#run-download-routine)
  + [Run visualisation page](#run-visualisation-page)
* [Data model](#data-model)
  + [Collection `estates`](#collection--estates-)
    - [Subdocument `rawMetadata`](#subdocument--rawmetadata-)
* [How does it work ?](#how-does-it-work--)
* [Work in progress...](#work-in-progress)

## Context

Immoweb is the leading real estate classified ads website in Belgium. However, items disappear once they are sold or rented. If you want to be able to keep forever all the information about items (including description, photos and structured data such as PEB, bedroom count, price), you've come to the right place ! Immoweb Keeper, provided that you run it on a schedule (such as every day) and that you provide one or more search criteria, will automatically download all the new items matching those criteria and even redownload ones that were updated.

You are then free to analyse the long-term market trends, such as the evolution of price/transaction volume/average bedroom count/surface etc. in specific area over a specific time period. That part is still up to you as of today : you could use MongoDB Compass or MongoDB Charts to quickly analyse the data, use a front-end data vizualization framework to build an interactive webpage or use any other data vizualization tool.

## How to use

### Requirements

- You need to have Node.js and npm installed
- You need to have an instance of MongoDb installed on your machine

### Setup config

- Go to the root project directory using terminal & run `npm install`
- Make sure your MongoDB instance is running (you can run `mongod`)
- Modify the `config.env` file to match your MongoBD connection string, such as :
  ```sh
  MONGODB_URL=mongodb://localhost:27017
  MONGODB_DATABASE=immoweb
  ```
- Create a `config.json` file with the following items :
  * `imageRepository` : the path on your filesystem where you would like the items' images to be downloaded
  * `searchURLs` : just go to http://www.immoweb.be, choose you criterias and paste the url once you are on the search results page, OR :
  
  * `searchQueries` : an alternative, more structured way of storing the search criteria than the search url (the filter names are those from immoweb urls query params) 
 
  ```json
  {
    "imageRepository": "~/immoweb/photos",
    "searchURLs": [
        "https://www.immoweb.be/en/search/house/for-rent?countries=BE&postalCodes=BE-1140&orderBy=relevance",
        "https://www.immoweb.be/en/search/apartment/for-rent?countries=BE&minBedroomCount=1&propertySubtypes=KOT%2CFLAT_STUDIO&page=1&orderBy=relevance"
    ],
    "searchQueries": [{
            "propertyTypes": ["HOUSE"],
            "postalCodes": [1030, 1040, 1140],
            "maxPrice": 600000,
            "minBedroomCount": 3
        }, {
            "propertyTypes": ["GARAGE"],
            "postalCodes": [1030, 1040, 1140]
        }]
  }
  ```

### Run download routine

Execute `npm run routine` to start the download routine.

Ideally, you should setup a cron job to execute the routine daily (there are various ways of achieving this depending on your OS).

All the structured data and the pictures will be respectively stored in your MongoDB database and on your hard drive.

Then, it's up to you to decide how you want to xplore : you can use the front-end described in next section to explore the results, or you can setup any data vizualisation tool.

It is good to know that :
- The first time you include a search query/url in the config and run Immoweb Keeper, it will browse through all search results matching that criteria
- The next times, Immoweb Keeper will sort the results from the most recently to the least recently updated item, and stop browsing the results when it reaches an item that has not been updated since the last time you runned Immoweb Keeper

### Run visualisation page

- Execute ``npm run server`` to setup the server that will expose the data from your MongoDB
  * if you want to use another port than 5000, you can override the default port in ``config.env``

- Execute ``npm run client`` and the React ImmowebKeeper website will pop up in your default browser and allow you to explore the results !
  * use the filters on top to dive into your results
  * currently, the filtering is done on all the results that exist in your database, no distinction is made between the different search queries
  * lots of improvements and optimizations yet to come !

## Data model

If the provided front-end is a bit light for your needs, you are free to explore the data with any tool you want. Here is a documentation of how the data is structured in the MongoDB database :

### Collection `estates`

|       Field         |            Source             |                      Description                    |
| ------------------- | ----------------------------- | --------------------------------------------------- |
| _id                 | MongoDB                       | unique id generated by mongodb                      |
| rawMetada           | Immoweb                       | all the raw metadata as it was fetched from Immoweb |
| fetchDate           | Immoweb Keeper                | datetime of the download                            |
| images              | Immoweb Keeper                | item's pictures file paths on your hard drive       |
| lastSeen            | Immoweb Keeper                | date of last run in which that item appeared        |
| disappearanceDate   | Immoweb Keeper                | date of first run in which it was not there anymore |
| immowebCode         | rawMetadata                   | unique id within immoweb                            |
| lastModificationDate| rawMetadata                   | cast to datetime                                    |
| creationDate        | rawMetadata                   | cast to datetime                                    |
| expirationDate      | rawMetadata                   | cast to datetime                                    |
| geolocation         | rawMetadata.property.location | better format for direct display in MongoDB compass |

#### Subdocument `rawMetadata`

Whereas the first level structure is guaranteed by Immoweb Keeper, the *rawMetadata* field structure could change without notice in the case of Immoweb changing things in their data structure. Only a change in the lastModificationDate and id (which holds the immoweb code) would break the Immoweb Keeper routine as it uses them for indexing data and knowing when to stop to browse results. Any other modification in the structure would just make the afterhand data analysis more difficult.

|       Field path              |  Filter in front-end ?  | Usage in front-end |
| -------------------           | ----------------------  | ------------------ |
| immowebCode                   |                         | card, table        |
| price.mainValue               | v                       | card, table        |
| property.location.postalCode  | v                       | card, table        |
| property.location.locality    | v                       | card, table        |
| property.location.geolocation | v                       | map                |
| property.location.street      | v                       | card, table        |
| property.hasGarden            | v                       | card, table        |
| property.gardenSurface        | v                       | card, table        |
| customers[0].name             |                         | card               |
| customers[0].logoUrl          |                         | card               |
| flags.isPublicSale            |                         | card               |
| flags.isSoldOrRented          |                         | card               |
| flags.isUnderOption           |                         | card               |

## How does it work ?

- All the structured data about real estate items will be stored in your **immoweb** MongoDB database (in collections **estates**)
- All the item pictures will be downloaded to your image repository folder, in subfolders named after their immoweb codes
- The details (url, list of criteria, last run date) of the search query will be stored as documents the *queries* collection of the *immoweb* database, along with the last time when it was runned

Here is the overview of how the code is organized. When you run it, the script will :

- Create a database called *immoweb* in your mongodb instance specified in *mongoDBUrl* (if it does not exist already)
- Create the folder for the image repository as mentioned in *imageRepository* (if it does not exist already)
- For each of your search result's URLs or structured queries, it will then :
  - Get the last run date from the *queries* collection of the *immoweb* mongodb
  - Add a filter to sort results from the most to the least recently updated/created
  - For each page of results, it will extract all the immoweb codes and for each of them, it will :
    - Get the JSON metadata provided by immoweb in the source code of the item webpage
    - Get the lastModificationDate from the metadata : if it is older than the last run date of this query, go on with the next query
    - Get all the item's pictures' urls from the media.pictures item from the metadata
    - Download all pictures to the path *<imageRepository>/<immowebCode>/<pictureName>.jpg*
    - Create a new document in the *estate* collection of the *immoweb* database with the immoweb metadata wrapped with other data (cf next section)
  - Save the current date and time as the last run date for that query in the *query* collection of the *immoweb* database

## Work in progress...

The download routine is working fully, but the front-end visualization page, although working, is still under construction : only a few filters exist, the retrieval of items from the database is far from efficient and there is no way to select for which query we want to see the results : the filters work on the basis of the full set of data and their min/max/allowed values (price range, list of zip codes) does not change according to the bounds that we can find in the database.
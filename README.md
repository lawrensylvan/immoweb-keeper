# Immoweb Keeper
An Immoweb.be scraper that runs your favorite search queries and saves results to your MongoDb database

## Context

Immoweb is the leading real estate classified ads website in Belgium. However, items disappear once they are sold or rented. If you want to be able to keep forever all the information about items (including description, photos and structured data such as PEB, bedroom count, price), you've come to the right place ! Immoweb Keeper, provided that you run it on a schedule (such as every day) and that you provide one or more search criteria, will automatically download all the new items matching those criteria and even redownload ones that were updated.

You are then free to analyse the long-term market trends, such as the evolution of price/transaction volume/average bedroom count/surface etc. in specific area over a specific time period. That part is still up to you as of today : you could use MongoDB Compass or MongoDB Charts to quickly analyse the data, use a front-end data vizualization framework to build an interactive webpage or use any other data vizualization tool.

## How to use

### Requirements

- You need to have Node.js installed
- You need to have an instance of MongoDb installed on your machine

### Download dependencies

Go to the project directory using terminal & run

```sh
npm install
```

### Create a config.json file

```json
{
    "imageRepository": "/Users/Vleminckx/immoweb/photos",
    "mongoDBUrl": "mongodb://localhost:27017",
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

- The *imageRepository* is the path on your filesystem where you want all the images of the items to be stored
- The *mongoDBUrl* is the connection string to your mongodb instance
- You can then specify one or more search queries that you want to be runned. Each of which can be specified in 2 different formats :

  - A **full immoweb search query url** : just go to http://www.immoweb.be, choose you criterias and paste the url in config.json once you are on the search results page

  - A **structured JSON query** using the criteria names as they appear at the end of the immoweb search URL

  - The structured queries defined in *searchQueries* will be converted to urls and processed along with the urls defined in *searchURLs*

### Run to download search results

```sh
$ npm start
```

- All the structured data about real estate items will be stored in the *estates* collection of the *immoweb* database on your mongodb instance
- All the items' pictures will be downloaded to your image repository folder, in subfolders named after their *immoweb codes*
- The details (url and list of criteria) of the search query will be stored as documents the *queries* collection of the *immoweb* database, along with the last time when it was runned

It is good to know that :
- The first time you include a search query/url in the config and run Immoweb Keeper, it will browse through all search results matching that criteria
- The next times, Immoweb Keeper will sort the results from the most recently to the least recently updated item, and stop browsing the results when it reaches an item that has not been updated since the last time you runned Immoweb Keeper

## How does it work ?

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

## Data structure

Here is the root structure of a document in the *estates* collection of the *immoweb* database :

```js
{
    immowebCode,          // The Immoweb code of the real estate item
    fetchDate,            // The current date
    lastModificationDate, // The last modification date from the immoweb metadata (converted to standard date)
    creationDate,         // The creaiont date from the immoweb metadata (converted to standard date)
    expirationDate,       // The expiration date from the immoweb metadata (converted to standard date)
    geolocation,          // The location information if available from the immoweb metadata (converted to [longitude, latitude])
    images,               // The image file names (just have to add the image repo path + immoweb code folders to get the real file location) 
    rawMetadata,          // All the immoweb metadata (cf. next section for details)
}
```

Whereas the first level structure is guaranteed by Immoweb Keeper, the *rawMetadata* field structure could change without notice in the case of Immoweb changing things in their data structure. Only a change in the lastModificationDate and id (which holds the immoweb code) would break Immoweb Keeper as it uses them for indexing data and knowing when to stop to browse results. Any other modification in the structure would just make the afterhand data analysis more difficult.

## In progress...

This is a full working beta version, but some better error handling will be done shortly.

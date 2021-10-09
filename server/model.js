const mongoose = require('mongoose')

/* Mongoose models */

const estateSchema = new mongoose.Schema({
    immowebCode             : Number,
    fetchDate               : Date,
    lastModificationDate    : Date,
    creationDate            : Date,
    expirationDate          : Date,
    geoLocation             : [Number],
    images                  : [String],
    rawMetadata: {
        id                      : Number,
        cluster                 : Object,           // always null ?
        customers               : Array,    // TODO
        premiumProjectPage      : Object,   // TODO
        flags                   : Object,   // TODO
        media                   : Object,   // TODO
        property                : {
            type                    : String,
            subtype                 : String,
            title                   : Object,
            description             : String,
            name                    : String,       // always null
            isHolidayProperty       : Boolean,
            bedroomCount            : Number,
            bedrooms                : [{
                surface                     : Number
            }],
            bathroomCount           : Number,
            bathrooms               : Array,        // always empty
            location                : {
                country                     : String,
                region                      : String,
                province                    : String,
                district                    : String,
                locality                    : String,
                postalCode                  : String,
                street                      : String,
                number                      : String,
                box                         : String,
                propertyName                : String,       // always null
                floor                       : Number,       // always null
                latitude                    : Number,
                longitude                   : Number,
                approximated                : Boolean,      // always null
                regionCode                  : String,
                type                        : String,
                hasSeaView                  : Boolean,
                pointOfInterests            : [{
                    distance                    : Number,
                    type                        : String
                }],
                placeName                   : String
            },
            netHabitableSurface     : Number,
            roomCount               : Number,   // always null
            attic                   : {
                isAccessibleWithFixedStairs : Boolean,
                isIsolated                  : Boolean,
                surface                     : Number
            },
            hasAttic                : Boolean,
            basement                : {
                surface                     : Number
            },
            hasBasement             : Boolean,
            hasDressingRoom         : Boolean,
            diningRoom              : {
                surface                     : Number
            },
            hasDiningRoom           : Boolean,
            building                : Object, // TODO
            propertyCertificates    : Object, // TODO
            hasCaretakerOrConcierge : Boolean,
            hasDisabledAccess       : Boolean,
            hasLift                 : Boolean,
            constructionPermit      : Object, // TODO
            energy                  : Object, // TODO
            kitchen                 : Object, // TODO
            land                    : Object, // TODO
            laundryRoom             : {
                surface                     : Number
            },
            hasLaundryRoom          : Boolean,
            livingRoom              : {
                surface                     : Number
            },
            hasLivingRoom           : Boolean,
            isFirstOccupation       : Boolean,
            hasBalcony              : Boolean,
            hasBarbecue             : Boolean,
            hasGarden               : Boolean,
            gardenSurface           : Number,
            gardenOrientation       : String,
            parkingCountIndoor      : Number,
            parkingCountOutdoor     : Number,
            parkingCountClosedBy    : Number,
            hasAirConditioning      : Boolean,
            hasArmoredDoor          : Boolean,
            hasVisiophone           : Boolean,
            hasSecureAccessAlarm    : Boolean,
            hasTVCable              : Boolean,
            hasDoorPhone            : Boolean,
            hasInternet             : Boolean,
            showerRoomCount         : Number,
            showerRooms             : Array,
            specificities           : Object, // TODO
            toiletCount             : Number,
            toilets                 : Array,
            hasFitnessRoom          : Boolean,
            hasTennisCourt          : Boolean,
            hasSwimmingPool         : Boolean,
            hasSauna                : Boolean,
            hasJacuzzi              : Boolean,
            hasHammam               : Boolean,
            bedroomSurface          : Number,
            alternativeDescriptions : {
                fr                      : String,
                nl                      : String
            },
            habitableUnitCount  : Number,           // always null
            fireplaceCount      : Number,
            fireplaceExists     : Boolean,
            terraceSurface      : Number,
            terraceOrientation  : String
        },
        publication             : Object,   // TODO
        transaction             : Object,   // TODO
        priceType               : String,           // always null ?
        price: {
            accessibilityPrice      : String,
            additionalValue         : Object,       // always null ?
            alternativeDisplayPrice : String,
            alternativeValue        : Object,
            HTMLDisplayPrice        : String,
            label                   : String,
            language                : String,
            mainDisplayPrice        : String,
            mainValue               : Number,
            maxRangeValue           : Object,
            minRangeValue           : Object,
            oldDisplayPrice         : String,
            oldValue                : Number,
            shortDisplayPrice       : String,
            type                    : String
        },
        externalReference       : String,
        isBookmarked            : Boolean,
        hasSectionsArray        : Object,   // TODO
        unitGroupings           : Array,    // TODO
        displayFlags            : Object,   // TODO
        statistics              : Object    // TODO
    }
}, { typeKey: '$type' })

const EstateModel = mongoose.model('estate', estateSchema)

module.exports = {EstateModel}
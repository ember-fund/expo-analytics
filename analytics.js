import { Platform, Dimensions } from 'react-native';
import Constants from 'expo-constants';

import { ScreenHit, PageHit, Event, Serializable } from './hits';

const { width, height } = Dimensions.get('window');

const version = require('../../package.json').version;

let defaultOptions = { debug: false };

export default class Analytics {
    customDimensions = []
    customMetrics = []

    constructor(propertyId, additionalParameters = {}, options = defaultOptions){
        this.propertyId = propertyId;
        this.options = options;
        this.clientId = Constants.deviceId;

        this.promiseGetWebViewUserAgentAsync = Constants.getWebViewUserAgentAsync()
            .then(userAgent => {
                this.userAgent = userAgent;

                this.parameters = {
                    an: 'ember',
                    aid: 'expo-template-bare',
                    av: version,
                    sr: `${width}x${height}`,
                    ...additionalParameters
                };

                if(this.options.debug){
                    console.log(`[expo-analytics] UserAgent=${userAgent}`);
                    console.log(`[expo-analytics] Additional parameters=`, this.parameters);
                }
            });
    }

    hit(hit){
        // send only after the user agent is saved
        return this.promiseGetWebViewUserAgentAsync
            .then(() => this.send(hit));
    }

    event(event){
        // send only after the user agent is saved
        return this.promiseGetWebViewUserAgentAsync
            .then(() => this.send(event));
    }

    addParameter(name, value){
        this.parameters[name] = value;
    }

    addCustomDimension(index, value){
        this.customDimensions[index] = value;
    }

    removeCustomDimension(index){
        delete this.customDimensions[index];
    }

    addCustomMetric(index, value) {
        this.customMetrics[index] = value;
      }

    removeCustomMetric(index) {
        delete this.customMetrics[index];
    }

    send(hit) {
        /* format: https://www.google-analytics.com/collect? +
        * &tid= GA property ID (required)
        * &v= GA protocol version (always 1) (required)
        * &t= hit type (pageview / screenview)
        * &dp= page name (if hit type is pageview)
        * &cd= screen name (if hit type is screenview)
        * &cid= anonymous client ID (optional if uid is given)
        * &uid= user id (optional if cid is given)
        * &ua= user agent override
        * &an= app name (required for any of the other app parameters to work)
        * &aid= app id
        * &av= app version
        * &sr= screen resolution
        * &cd{n}= custom dimensions
        * &cm{n}= custom metrics
        * &z= cache buster (prevent browsers from caching GET requests -- should always be last)
        *
        * Ecommerce track support (transaction)
        * &ti= transaction The transaction ID. (e.g. 1234)
        * &ta= The store or affiliation from which this transaction occurred (e.g. Acme Clothing).
        * &tr= Specifies the total revenue or grand total associated with the transaction (e.g. 11.99). This value may include shipping, tax costs, or other adjustments to total revenue that you want to include as part of your revenue calculations.
        * &tt= Specifies the total shipping cost of the transaction. (e.g. 5)
        *
        * Ecommerce track support (addItem)
        * &ti= transaction The transaction ID. (e.g. 1234)
        * &in= The item name. (e.g. Fluffy Pink Bunnies)
        * &ip= The individual, unit, price for each item. (e.g. 11.99)
        * &iq= The number of units purchased in the transaction. If a non-integer value is passed into this field (e.g. 1.5), it will be rounded to the closest integer value.
        * &ic= TSpecifies the SKU or item code. (e.g. SKU47)
        * &iv= The category to which the item belongs (e.g. Party Toys)
        */

        const customDimensions = this.customDimensions.map((value, index) => `cd${index}=${value}`).join('&');
        const customMetrics = this.customMetrics.map((value, index) => `cm${index}=${value}`).join('&');

        const params = new Serializable(this.parameters).toQueryString();

        const url = `https://www.google-analytics.com/collect?tid=${this.propertyId}&v=1&cid=${this.clientId}&${hit.toQueryString()}&${params}&${customDimensions}&${customMetrics}&z=${Math.round(Math.random() * 1e8)}`;

        let options = {
            method: 'get',
            headers: {
                'User-Agent': this.userAgent
            }
        }

        if(this.options.debug){
            console.log(`[expo-analytics] Sending GET request to ${url}`);
        }

        return fetch(url, options);
    }

}

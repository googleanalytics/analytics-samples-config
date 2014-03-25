/**
*
* Copyright 2014 Google Inc. All Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/


/**
 * @author pete.frisella@gmail.com (Pete Frisella)
 *
 * @fileoverview
 * Account Tree and Index Traversal using AccountSummaries.
 * Example of how to build an account tree and index from the Account Summaries
 * response. Includes functions to quickly retrieve any entity's summary info.
 * http://goo.gl/RrpLeV
 */


/**
 * Holds the account hiearchy for the authorized user. Each account, property,
 * and profile is an object with its Id as they key. This is used to traverse
 * the account hiearchy by Id.
 *
 * The structure is:
 *  {
 *    'account1Id': {
 *      'propertyId1': {
 *        'profileId1': {
 *          // property 1 profile 1 properties (id, kind, name, type)
 *        },
 *         'profileId2': {
 *          // property 1 profile 2 properties (id, kind, name, type)
 *        },
 *        // property 1 properties (id, internalWebPropertyId, kind, level,
 *                                  name, profiles, websiteUrl)
 *      },
 *      'propertyId2': {
 *        'profileId1': {
 *          // property 2 profile 1 properties.
 *        },
 *        // property 2 properties (id, internalWebPropertyId, kind, level,
 *                                  name, profiles, websiteUrl)
 *      },
 *      // account 1 properties (id, kind, name, webProperties)
 *    }
 *  }
 * @type {Object}
 */
var accountTree = {};


// Entity prefixes for the index.
var ACCOUNT_PREFIX = 'a';
var PROPERTY_PREFIX = 'p';
var PROFILE_PREFIX = 'v';


/**
 * An index of all entities and relationships. This is used to quickly lookup
 * any account, property, or view (profile) regardless of whether you know the
 * account hierarchy. E.g. This allows you to retrieve a profile without knowing
 * which account or property it belongs to.
 *
 * Example:
 * Assume we have account 1234 with a property UA-1235-1, and a profile 5678.
 * Assume ACCOUNT_PREFIX = 'a', PROPERTY_PREFIX = 'p', and PROFILE_PREFIX = 'p'
 * The structure of this object would be
 *  {
 *    'apUA-1234-1': '1234',
 *    'av5678': '1234',
 *    'pv5678': 'UA-1234-1'
 *  }
 * If you want to lookup the account (prefix 'a') for profile (prefix 'v') 5678
 * then the entityIndex key is 'av5678', which returns the account for the
 * profile.
 */
var entityIndex = {};


// Handles response from the Management API for Account Summaries.
function initSummaries(accountSummariesResponse) {
  buildAccountTreeIndex(accountSummariesResponse);
}


/**
 * Iterates through all account, property, and profile arrays from the Account
 * Summaries response and converts them to objects to make it easy to traverse
 * by Ids. It also builds the entityIndex to make it easy to determine entity
 * relationships.
 *
 * @param {Object} accountSummariesResponse The Management API response for an
 *    Account Summaries collection.
 */
function buildAccountTreeIndex(accountSummariesResponse) {
  for (var i = 0, account; account = accountSummariesResponse.items[i]; ++i) {
    accountTree[account.id] = account;

    for (var w = 0, property; property = account.webProperties[w]; ++w) {
      // Deleted properties have 0 profiles, so don't include them.
      if (property.profiles) {
        accountTree[account.id][property.id] = property;
        entityIndex[ACCOUNT_PREFIX + PROPERTY_PREFIX +
                    property.id] = account.id;

        for (var p = 0, profile; profile = property.profiles[p]; ++p) {
          accountTree[account.id][property.id][profile.id] = profile;
          entityIndex[ACCOUNT_PREFIX + PROFILE_PREFIX +
                      profile.id] = account.id;
          entityIndex[PROPERTY_PREFIX + PROFILE_PREFIX +
                      profile.id] = property.id;
        }
      }
    }
  }
}


/**
 * Returns the parent account of a property.
 *
 * @param {string} propertyId The Id of the property.
 * @return {Object|undefined} The parent account for the given property Id or
 *    undefined if the property is not found.
 */
function getAccountByPropertyId(propertyId) {
  var indexKey = ACCOUNT_PREFIX + PROPERTY_PREFIX + propertyId;
  var accountId = _getEntityId(indexKey);
  return getAccount(accountId);
}


/**
 * Returns the parent account of a profile.
 *
 * @param {string} profileId The Id of the profile.
 * @return {Object|undefined} The parent account for the give profile Id or
 *    undefined if the profile is not found.
 */
function getAccountByProfileId(profileId) {
  var indexKey = ACCOUNT_PREFIX + PROFILE_PREFIX + profileId;
  var accountId = _getEntityId(indexKey);
  return getAccount(accountId);
}


/**
 * Returns the parent property of a profile.
 *
 * @param {string} profileId The Id of the profile.
 * @return {Object|undefined} The parent property for the give profile Id or
 *    undefined if the profile is not found.
 */
function getPropertyByProfileId(profileId) {
  var accountIndexKey = ACCOUNT_PREFIX + PROFILE_PREFIX + profileId;
  var propertyIndexKey = PROPERTY_PREFIX + PROFILE_PREFIX + profileId;
  var accountId = _getEntityId(accountIndexKey);
  var propertyId = _getEntityId(propertyIndexKey);
  return _getProperty(accountId, propertyId);
}


/**
 * Returns an account given an account Id.
 *
 * @param {string} accountId The Id of the account to retrieve.
 * @return {Object} The account or an empty object if the account is not found.
 */
function getAccount(accountId) {
  if (accountTree[accountId]) {
    return accountTree[accountId];
  }
  return {};
}


/**
 * Returns a property given a property Id.
 *
 * @param {string} propertyId The Id of the property to retrieve.
 * @return {Object} The property or an empty object if the property is not
 *    found.
 */
function getProperty(propertyId) {
  var account = getAccountByPropertyId(propertyId);
  if (account) {
    return account[propertyId];
  }
  return {};
}


/**
 * Returns a profile given a profile Id.
 *
 * @param {string} profileId The Id of the profile to retrieve.
 * @return {Object} The profile or an empty object if the profile is not found.
 */
function getProfile(profileId) {
  var property = getPropertyByProfileId(profileId);
  if (property) {
    return property[profileId];
  }
  return {};
}


/**
 * Returns a property given an account and property Id.
 *
 * @param {string} accountId The parent account Id of the property to retrieve.
 * @param {string} propertyId The Id of the property to retrieve.
 * @return {Object} The property or an empty object if the property is not
 *    found.
 *
 * @private
 */
function _getProperty(accountId, propertyId) {
  if (accountTree[accountId] && accountTree[accountId][propertyId]) {
    return accountTree[accountId][propertyId];
  }
  return {};
}


/**
 * Returns the Id of an entity in the index.
 *
 * @param {string} indexKey The key of the entity index to retrieve.
 * @return {string} The entity Id or an empty string if the key is not found.
 *
 * @private
 */
function _getEntityId(indexKey) {
  if (entityIndex[indexKey]) {
    return entityIndex[indexKey];
  }
  return '';
}

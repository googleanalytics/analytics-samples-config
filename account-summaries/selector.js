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
 * Profile Selector Demo using AccountSummaries.
 * Example of how to build an account/property/view (profile) selector
 * using the Google Analytics Mangement API AccountSummaries response.
 * http://goo.gl/RrpLeV
 */


// DOM Ids to populate with HTML based on selection changes.
var ACCOUNT_CONTAINER = 'accounts';
var PROPERTY_CONTAINER = 'properties';
var PROFILE_CONTAINER = 'profiles';
var PROFILE_DETAILS = 'profile-details';

// DOM Ids for selectors.
var ACCOUNT_SELECTOR = 'account-selector';
var PROPERTY_SELECTOR = 'property-selector';
var PROFILE_SELECTOR = 'profile-selector';


/**
 * Holds the AccountSummaries response object and the complete account hiearchy.
 * @type {Object}
 */
var accountTree = {};


/**
 * Holds the HTML for each dropdown selector. Acts as a cache.
 * @type {Object}
 */
var selectorHtml = {};


/**
 * Handles response from the Management API for Account Summaries.
 *
 * @param {Object} accountSummariesResponse The response from a Management API
 *    request for an AccountSummaries resource.
 */
function initSummaries(accountSummariesResponse) {
  buildAccountTree(accountSummariesResponse);

  // Set handlers to update selectors on change.
  document.getElementById(ACCOUNT_CONTAINER).onchange = onAccountSelectorChange;
  document.getElementById(PROPERTY_CONTAINER).onchange =
      onPropertySelectorChange;
  document.getElementById(PROFILE_CONTAINER).onchange = onProfileSelectorChange;

  // Set initial account selector and force update.
  document.getElementById(ACCOUNT_CONTAINER).innerHTML =
      getAccountSelectorHtml(accountTree);
  onAccountSelectorChange();
}


/**
 * Updates the account tree to make it possible to find accounts by Id.
 *
 * @param {Object} summaries The Management API response for AccountSummaries.
 */
function buildAccountTree(summaries) {
  for (var i = 0, account; account = summaries.items[i]; ++i) {
    accountTree[account.id] = account;
  }
}


/**
 * Builds and returns HTML for the account selector.
 *
 * @return {string} The account selector HTML.
 */
function getAccountSelectorHtml() {
  var html = ['<select id="', ACCOUNT_SELECTOR, '">'];
  for (account in accountTree) {
    html.push('<option value="', accountTree[account].id, '">');
    html.push(accountTree[account].name, '</option>');
  }
  html.push('</select>');
  return html.join('');
}


/**
 * Returns HTML for the property selector.
 * This first checks if the HTML is already available, and if not then it
 * creates the HTML and saves it in selectorHtml for future requests. This also
 * updates the property for the given aconunt to make it possible to find
 * properties by account, and property Id.
 *
 * @param {string} accountId The account id for which to build the property
 *    selector.
 * @return {string} The property selector HTML.
 */
function getPropertySelectorHtml(accountId) {
  var propertyKey = accountId;

  if (selectorHtml[propertyKey]) {
    return selectorHtml[propertyKey];
  }

  var propertyTree = accountTree[accountId].webProperties;
  var html = ['<select id="', PROPERTY_SELECTOR, '">'];

  for (var w = 0, property; property = propertyTree[w]; ++w) {
    // Deleted properties have 0 profiles, so don't include them.
    if (property.profiles) {
      accountTree[accountId][property.id] = property;
      html.push('<option value="', property.id, '">');
      html.push(property.name, '</option>');
    }
  }
  html.push('</select>');
  selectorHtml[propertyKey] = html.join('');
  return selectorHtml[propertyKey];
}


/**
 * Returns HTML for the profile selector.
 * This first checks if the HTML is already available and if not it creates the
 * HTML and saves it in selectorHtml for future requests. This also updates the
 * accountTree with the profiles for the given account and property to make it
 * possible to find profiles by account, property, and profile Id.
 *
 * @param {string} accountId The accouint Id for which to build the profile
 *    selector.
 * @param {string} propertyId The property Id for which to build the profile
 *    selector.
 * @return {string} The profile selector HTML.
 */
function getProfileSelectorHtml(accountId, propertyId) {
  var profileKey = accountId + propertyId;

  if (selectorHtml[profileKey]) {
    return selectorHtml[profileKey];
  }

  var profileTree = accountTree[accountId][propertyId].profiles;
  var html = ['<select id="', PROFILE_SELECTOR, '">'];

  for (var p = 0, profile; profile = profileTree[p]; ++p) {
    accountTree[accountId][propertyId][profile.id] = profile;
    html.push('<option value="', profile.id, '">', profile.name, '</option>');
  }

  html.push('</select>');
  selectorHtml[profileKey] = html.join('');
  return selectorHtml[profileKey];
}


/**
 * Handler for when the selected account has changed.
 */
function onAccountSelectorChange() {
  updatePropertySelectorHtml(getSelectedAccount());
  updateProfileSelectorHtml(getSelectedAccount(), getSelectedProperty());
  updateProfileDetails();
}


/**
 * Handler for when the selected property has changed.
 */
function onPropertySelectorChange() {
  updateProfileSelectorHtml(getSelectedAccount(), getSelectedProperty());
  updateProfileDetails();
}


/**
 * Handler for when the selected profile has changed.
 */
function onProfileSelectorChange() {
  updateProfileDetails();
}


/**
 * Updates the property selector HTML based on the selected account.
 *
 * @param {string} accountId The Id of the selected account.
 */
function updatePropertySelectorHtml(accountId) {
  var propertySelector = document.getElementById(PROPERTY_CONTAINER);
  propertySelector.innerHTML = getPropertySelectorHtml(accountId);
}


/**
 * Updates the view (profile) selector HTML based on the selected account.
 *
 * @param {string} accountId The Id of the selected account.
 * @param {string} propertyId The Id of the selected property.
 */
function updateProfileSelectorHtml(accountId, propertyId) {
  var profileSelector = document.getElementById(PROFILE_CONTAINER);
  profileSelector.innerHTML = getProfileSelectorHtml(accountId, propertyId);
}


function getSelectedAccount() {
  return document.getElementById(ACCOUNT_SELECTOR).value;
}


function getSelectedProperty() {
  return document.getElementById(PROPERTY_SELECTOR).value;
}


function getSelectedProfile() {
  return document.getElementById(PROFILE_SELECTOR).value;
}


/**
 * Outputs details of the selected View (Profile).
 */
function updateProfileDetails() {
  var html = [];
  var account = accountTree[getSelectedAccount()];
  var property = accountTree[getSelectedAccount()][getSelectedProperty()];
  var profile = accountTree[getSelectedAccount()][getSelectedProperty()][
      getSelectedProfile()];

  html.push('Account Name: ', account.name, '<br>Account Id: ', account.id);
  html.push('<br><br>', 'Property Name: ', property.name, '<br>Property Id: ');
  html.push(property.id, '<br>Level: ', property.level);
  html.push('<br>Internal Property Id: ', property.internalWebPropertyId);

  if (property.websiteUrl) {
    html.push('<br>URL: ', property.websiteUrl);
  }

  html.push('<br><br>View Name: ', profile.name, '<br>View Id: ', profile.id);
  html.push('<br>Type: ', profile.type);

  document.getElementById(PROFILE_DETAILS).innerHTML = html.join('');
}

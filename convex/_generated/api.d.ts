/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_analyzeCompatibility from "../actions/analyzeCompatibility.js";
import type * as actions_parseProfile from "../actions/parseProfile.js";
import type * as actions_parseVoiceProfile from "../actions/parseVoiceProfile.js";
import type * as actions_seedTestPhotos from "../actions/seedTestPhotos.js";
import type * as actions_seedTestUsers from "../actions/seedTestUsers.js";
import type * as actions_seedVoiceTestUsers from "../actions/seedVoiceTestUsers.js";
import type * as actions_voiceQuestionDefinitions from "../actions/voiceQuestionDefinitions.js";
import type * as answers from "../answers.js";
import type * as compatibilityAnalyses from "../compatibilityAnalyses.js";
import type * as config from "../config.js";
import type * as lib_canonicalValues from "../lib/canonicalValues.js";
import type * as lib_interests from "../lib/interests.js";
import type * as lib_openai from "../lib/openai.js";
import type * as lib_prompts from "../lib/prompts.js";
import type * as matching from "../matching.js";
import type * as photos from "../photos.js";
import type * as questions from "../questions.js";
import type * as seedQuestions from "../seedQuestions.js";
import type * as seedTestUsers from "../seedTestUsers.js";
import type * as storage from "../storage.js";
import type * as userProfiles from "../userProfiles.js";
import type * as users from "../users.js";
import type * as voiceRecordings from "../voiceRecordings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/analyzeCompatibility": typeof actions_analyzeCompatibility;
  "actions/parseProfile": typeof actions_parseProfile;
  "actions/parseVoiceProfile": typeof actions_parseVoiceProfile;
  "actions/seedTestPhotos": typeof actions_seedTestPhotos;
  "actions/seedTestUsers": typeof actions_seedTestUsers;
  "actions/seedVoiceTestUsers": typeof actions_seedVoiceTestUsers;
  "actions/voiceQuestionDefinitions": typeof actions_voiceQuestionDefinitions;
  answers: typeof answers;
  compatibilityAnalyses: typeof compatibilityAnalyses;
  config: typeof config;
  "lib/canonicalValues": typeof lib_canonicalValues;
  "lib/interests": typeof lib_interests;
  "lib/openai": typeof lib_openai;
  "lib/prompts": typeof lib_prompts;
  matching: typeof matching;
  photos: typeof photos;
  questions: typeof questions;
  seedQuestions: typeof seedQuestions;
  seedTestUsers: typeof seedTestUsers;
  storage: typeof storage;
  userProfiles: typeof userProfiles;
  users: typeof users;
  voiceRecordings: typeof voiceRecordings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

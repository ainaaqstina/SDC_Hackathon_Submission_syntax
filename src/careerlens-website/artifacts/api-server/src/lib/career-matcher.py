#!/usr/bin/env python3
"""Deterministic, source-aware career matching for CareerLens."""

import json
import math
import re
import sys
import unicodedata
from collections import Counter


TRANSFERABLE_SKILL_CROSSWALKS = {
    "complex problem solving": {"problem solving", "problem-solving"},
    "coordination": {
        "care coordination", "project coordination", "interview coordination",
        "team coordination",
    },
    "instructing": {"teaching", "training", "patient education"},
    "judgment and decision making": {
        "clinical judgment", "clinical judgement", "decision making",
    },
    "programming": {
        "c", "c#", "c++", "go", "java", "javascript", "php", "python",
        "ruby", "rust", "sql", "swift", "typescript",
    },
    "service orientation": {
        "customer care", "customer service", "patient care", "patient advocacy",
        "user support",
    },
    "systems analysis": {
        "requirements analysis", "systems analysis",
    },
    "time management": {"scheduling", "time management"},
    "troubleshooting": {
        "debugging", "issue resolution", "technical support", "troubleshooting",
    },
}

DOMAIN_TOKEN_ALIASES = {
    "nursing": "nurse",
    "nurses": "nurse",
    "researcher": "research",
    "researchers": "research",
    "communications": "communication",
    "developer": "develop",
    "developers": "develop",
    "development": "develop",
    "programmer": "program",
    "programmers": "program",
    "programming": "program",
}

DOMAIN_STOP_WORDS = {
    "and", "of", "the", "for", "user", "experience", "occupation",
    "occupations", "related", "technical", "family", "group",
}


def normalize(value):
    value = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode()
    value = value.replace("++", "plusplus").replace("#", "sharp")
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value.lower()).split())


def main():
    payload = json.load(sys.stdin)
    alias_to_canonical = {"js": "javascript", "reactjs": "react", "react js": "react", "nodejs": "node js"}
    for group in payload.get("skillAliases", []):
        canonical = normalize(group.get("canonicalName"))
        if not canonical:
            continue
        alias_to_canonical[canonical] = canonical
        for alias in group.get("aliases", []):
            normalized_alias = normalize(alias)
            if normalized_alias:
                alias_to_canonical[normalized_alias] = canonical

    def canonical_skill(value):
        normalized = normalize(value)
        return alias_to_canonical.get(normalized, normalized)

    crosswalk_aliases = {}
    for canonical, aliases in TRANSFERABLE_SKILL_CROSSWALKS.items():
        for alias in aliases:
            crosswalk_aliases.setdefault(normalize(alias), set()).add(normalize(canonical))

    def canonical_skills(value):
        normalized = normalize(value)
        canonical = canonical_skill(value)
        result = {canonical} if canonical else set()
        result.update(crosswalk_aliases.get(normalized, set()))
        result.update(crosswalk_aliases.get(canonical, set()))
        return result

    profile = payload.get("profile", {})
    profile_skills = [
        str(skill.get("name") if isinstance(skill, dict) else skill).strip()
        for skill in profile.get("skills", [])
        if (skill.get("name") if isinstance(skill, dict) else skill)
    ]
    profile_canonical = {
        canonical
        for skill in profile_skills
        for canonical in canonical_skills(skill)
    }
    interests = {normalize(value) for value in profile.get("interests", []) if normalize(value)}
    domain_terms = [
        normalize(profile.get("primaryDomain")),
        normalize(profile.get("fieldOfStudy")),
    ]
    occupations = payload.get("occupations", [])
    software_catalog = payload.get("softwareCatalog")
    if software_catalog is None:
        software_catalog = [item.get("softwareSkills", []) for item in occupations]
    def software_name(item):
        return item.get("name", "") if isinstance(item, dict) else item

    software_frequency = Counter(
        skill for names in software_catalog
        for skill in {canonical_skill(software_name(item)) for item in names if canonical_skill(software_name(item))}
    )
    catalog_size = len(software_catalog)
    # Ubiquitous office software should not dominate occupational discovery.
    # Use the complete catalog for target analysis as well as discovery.
    profile_software = {
        canonical_skill(name): name for name in profile_skills
        if canonical_skill(name) in software_frequency
        and (catalog_size < 20 or software_frequency[canonical_skill(name)] <= catalog_size / 2)
    }

    def software_weight(skill):
        return 1 + math.log((catalog_size + 1) / (software_frequency[skill] + 1))

    def context_tokens(text):
        return {
            DOMAIN_TOKEN_ALIASES.get(token, token)
            for token in normalize(text).split()
            if token not in DOMAIN_STOP_WORDS
        }

    ranked = []
    for occupation in occupations:
        requirements = occupation.get("requiredSkills", [])
        requirements = [str(item).strip() for item in requirements if str(item).strip()]
        requirements = list({canonical_skill(item): item for item in requirements}.values())
        canonical_requirements = [canonical_skill(item) for item in requirements]
        matched_keys = set(canonical_requirements) & profile_canonical
        matched = []
        missing = []
        for required, canonical in zip(requirements, canonical_requirements):
            if canonical in matched_keys:
                matched.append(required)
            else:
                missing.append(required)

        importance = {
            canonical_skill(name): float(weight)
            for name, weight in occupation.get("skillImportance", {}).items()
            if isinstance(weight, (int, float)) and math.isfinite(weight) and weight > 0
        }
        total_weight = sum(importance.get(name, 1) for name in canonical_requirements)
        coverage = round(100 * sum(importance.get(name, 1) for name in matched_keys) / total_weight) if total_weight else None
        occupation_software = {
            canonical_skill(software_name(item)): (
                1 if not isinstance(item, dict) or item.get("inDemand") is True else 0.5
            )
            for item in occupation.get("softwareSkills", []) if software_name(item)
        }
        matched_software = set(profile_software) & set(occupation_software)
        software_score = (
            round(100 * sum(software_weight(name) * occupation_software[name] for name in matched_software)
                  / sum(software_weight(name) for name in profile_software))
            if profile_software and occupation_software else None
        )
        if software_score is not None and coverage is not None:
            skill_score = round(0.7 * software_score + 0.3 * coverage)
            method = f"Skills index: 70% software relevance ({software_score}/100) + 30% importance-weighted category coverage ({coverage}/100)."
        elif software_score is not None:
            skill_score = software_score
            method = f"Software relevance only ({software_score}/100); transferable-skill ratings are unavailable."
        else:
            skill_score = coverage or 0
            method = f"Occupational skill coverage only ({skill_score}/100); no comparable specialized software evidence."
        if software_score is not None:
            method += f" {len(matched_software)} of {len(profile_software)} source-recognized profile software skills relate to this occupation, weighted by how specific they are across the catalog."
            if any(isinstance(item, dict) for item in occupation.get("softwareSkills", [])):
                method += " Source-snapshot in-demand examples receive full weight; other listed examples receive half weight. This is not live or local demand."
        if coverage is not None:
            method += f" {len(matched)} of {len(requirements)} occupational skill categories have profile evidence."
        else:
            method += " No missing occupational categories are inferred without source ratings."
        method += " Software examples are not universal requirements; this is not job readiness or a hiring probability."
        interest_terms = {
            normalize(value)
            for value in occupation.get("interestTags", [])
            if normalize(value)
        }
        occupation_context = normalize(
            f"{occupation.get('industry', '')} {occupation.get('title', '')} "
            + " ".join(occupation.get("responsibilities", []))
        )
        interest_context = context_tokens(occupation_context + " " + " ".join(interest_terms))
        if interests:
            interest_score = round(
                100 * sum(bool(context_tokens(value)) and context_tokens(value) <= interest_context for value in interests)
                / len(interests)
            )
            total_score = round(skill_score * 0.85 + interest_score * 0.15)
            method += f" Overall index: 85% skills + 15% stated-interest alignment ({interest_score}/100)."
        else:
            interest_score = None
            total_score = skill_score
            method += " No stated interests: the overall index uses skills only."
        domain_tokens = {
            DOMAIN_TOKEN_ALIASES.get(token, token)
            for term in domain_terms
            for token in term.split()
            if token not in DOMAIN_STOP_WORDS and len(token) > 2
        }
        title_tokens = {
            DOMAIN_TOKEN_ALIASES.get(token, token)
            for token in normalize(occupation.get("title", "")).split()
        }
        domain_tie_break = (sum(
            3
            for term in domain_terms
            if term and f" {term} " in f" {occupation_context} "
        )
        + len(
            domain_tokens
            & {
                DOMAIN_TOKEN_ALIASES.get(token, token)
                for token in occupation_context.split()
                if token not in DOMAIN_STOP_WORDS and len(token) > 2
            }
        ) + 3 * len(domain_tokens & title_tokens))

        ranked.append(
            {
                "id": str(occupation.get("id", "")),
                "title": str(occupation.get("title", "")),
                "industry": str(occupation.get("industry", "")),
                "score": max(0, min(100, total_score)),
                "skillsScore": max(0, min(100, skill_score)),
                "interestScore": interest_score,
                "softwareScore": software_score,
                "transferableSkillsScore": coverage,
                "scoringNote": method,
                "occupationCode": occupation.get("occupationCode"),
                "matchedSkills": matched + [
                    profile_software[name] for name in sorted(matched_software)
                    if name not in matched_keys
                ],
                "missingSkills": missing,
                "dataClassification": occupation.get("dataClassification", "demonstration"),
                "sourceName": occupation.get("sourceName"),
                "sourceUrl": occupation.get("sourceUrl"),
                "countryCode": occupation.get("countryCode"),
                "publicationPeriod": occupation.get("publicationPeriod"),
                "observedListingCount": occupation.get("observedListingCount"),
                "listingEvidenceUpdatedAt": occupation.get("listingEvidenceUpdatedAt"),
                "searchInterestNote": occupation.get("searchInterestNote"),
                "responsibilities": occupation.get("responsibilities", []),
                "sdgs": occupation.get("sdgs", []),
                "evidenceTieBreak": int(occupation.get("observedListingCount") or 0),
                "domainTieBreak": domain_tie_break,
            }
        )

    ranked.sort(
        key=lambda item: (
            -item["score"],
            -item["domainTieBreak"],
            -item["evidenceTieBreak"],
            normalize(item["industry"]),
            normalize(item["title"]),
        )
    )

    is_source_backed = any(
        item.get("dataClassification") == "source_backed"
        for item in payload.get("occupations", [])
    )
    supported_source_matches = [item for item in ranked if item["score"] > 0]
    target_career_id = payload.get("targetCareerId")
    if target_career_id:
        ranked = [item for item in ranked if item["id"] == target_career_id]
        target_count = len(ranked)
    elif is_source_backed and len(supported_source_matches) >= 5:
        ranked = supported_source_matches
        target_count = min(40, len(ranked))
    elif is_source_backed:
        ranked = [
            item for item in ranked
            if item["score"] > 0 or item["domainTieBreak"] > 0
        ]
        target_count = min(5, len(ranked))
    else:
        target_count = 5

    # Relevance first. Cross-family roles remain eligible, but a diversity quota
    # must never displace a better-supported specific occupation.
    selected = ranked[:target_count]

    for item in selected:
        item.pop("evidenceTieBreak", None)
        item.pop("domainTieBreak", None)
    json.dump(selected, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # emit structured errors without a stack trace to the API
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)

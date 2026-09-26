---
title: "Software for an Audience of One"
date: 2026-09-27
tags: ["ai", "building"]
description: "A handful of small apps built with AI agents, each for one person or five. What changes when the user is you, and why most of the work turns out to be deleting."
draft: true
---


As someone who grew up in the 90s, every neighbourhood had a tailor who kept your measurements in a notebook. You didn't buy a shirt off the rack; you dropped off the cloth and a week later got back something that fit you exactly. It fit nobody else, and nobody else was supposed to wear it.

For the last few months I've been making software the same way.

<!-- KB: the tailor is a stand-in hook, not a memory of yours. Swap in a real story if you have one (voice.md: story first), and keep the callback in the last line. -->

With AI agents doing most of the typing, the cost of building a small app has dropped close to zero. So I stopped asking "would anyone else use this?" and started asking "would I?" What came out is a handful of apps, each made to measure for one person, sometimes five. Some notes on what that's like.

## The shelf so far

- **antifeed** - one good read a day, picked overnight. No feed, no scroll. On days when nothing is worth my time, it adds nothing. *Nothing new is a valid outcome* is written into its rules.
- **five-a-side** - one page of football and fantasy football a day, for five friends. It has an AI assistant manager called Ted, who is allowed to be wrong (and often is).
- **kaizen** - one box on my phone to dump whatever is in my head, three habits to tick, and an essay about my week every Monday.
- **margin** - a sidebar that answers my doubts while I watch a lecture. A star means "remember this"; nothing else is asked of me.
- **traces** - a private life-log for two, drawn as one road through the years since we met.
- **this site** - hand-rolled, no framework. It now has swappable skins, because why not.

All of them are on the [projects](/projects/) page. The public ones have their code open, but none of them is a product. Nobody else is expected to use them.

## 1. The user is always in the room

The best part of building for one is that feedback takes zero days. I use the thing in the morning, find what annoys me, and it's fixed by the evening. No survey, no analytics, no roadmap meeting.

The worst part is the same thing. There is nobody to hide behind. If an app has a feature I don't use, I can't blame the users. I'm the users.

## 2. Most of the work is deleting

kaizen started as a six-room command centre: tagged todos, a nightly brief, a questions channel, 24 habits in four bands. It looked impressive for about three weeks.

Then I read my own data. I had ticked the habits every day from 1 to 22 August, and then never again. 40 of the 43 open items were work todos, which meant the personal app had quietly become a second office. The prompt behind the nightly brief was 9,700 words long and had half of itself pasted in twice. Nobody noticed, because nobody was reading the brief. Including me.

So I cut it down to one box and three habits. It's the version I actually open every day.

**A daily brief is a daily obligation to read it.** The one thing I kept was the weekly essay, because it asks nothing of me on a weekday.

## 3. Free data isn't free

Every app wants to measure things because measuring is cheap. Tap times, step counts, workout data from the watch. I tried a few of them. None of them measured what I cared about.

What worked was a word or two I choose to write. "Ran 5k." "Karpathy, ch 2." A note beats a sensor, because the note is the thing I wanted to remember in the first place.

## 4. Small is a feature, not a phase

Each app does less on purpose. One read, not a feed. One page, not an app. One box, not a system. When you're the only user, "we'll add that later" never becomes an excuse, because later you'll be the one who has to live with it.

Doing less also means finishing. A small thing that works every morning beats a big thing that's almost ready.

## 5. The agent needs a manual, and so do I

The tricky part isn't building the app. It's coming back to it three months later, or handing it to a fresh AI agent that has never seen it. So every app now has one file that says what it is, how to run it, how to check it and what was learned the hard way. Two commands in every repo: one to check, one to ship, and the ship refuses if the check fails.

That file turned out to be for me as much as for the agent. My memory of why I built something lasts about a fortnight.

## So why bother?

Because it's the most fun I've had making things in years. Not because any of it will scale. Because every one of these fits.

The tailor never had a second customer for any of those shirts. He didn't need one.

<!-- KB review:
- Title alternatives: "Made to Measure", "Apps Nobody Else Uses".
- Section 5 could become its own post (agent-legible repos). Cut it here if the post runs long.
- traces: kept to one line and no names, per me/who.md.
- ~800 words.
-->

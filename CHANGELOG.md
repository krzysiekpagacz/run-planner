# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Training creation wizard for coaches: a multi-step flow to add a workout with
  details, segments, and a summary review, reusable in edit mode.
- Per-row training management for coaches: add, edit, and delete workouts
  directly from the monthly table.
- "Plan" column showing each workout's segment breakdown, and a "Dodatkowe
  notatki" column listing workout and segment notes.
- Note management per cell: add, edit, and delete notes with a section-target
  dropdown, including an option to delete all notes for a workout at once.

### Changed

- Reorganized the coach dashboard: the view-mode toggle and "Dodaj trening"
  button sit together at the top, with the athlete list as a horizontal bar
  above the training table.
- Consolidated note action buttons to appear once per cell, revealed on hover.

### Fixed

- Require confirmation before deleting a note.
- Lock the date field when editing an existing training.

[Unreleased]: https://github.com/krzysiekpagacz/run-planner/compare/HEAD

## ADDED Requirements

### Requirement: Function catalog from the installed Strudel
A tool SHALL read the installed Strudel packages and write every documented function to a JSON catalog and a readable Markdown page. Each entry SHALL hold its name, synonyms, description, parameters, examples, package and source file. Functions registered without a documentation comment SHALL be listed and marked undocumented. The catalog SHALL record the version of each package it read.

#### Scenario: A documented function
- **WHEN** the catalog is built
- **THEN** it holds `voicing` with its description, parameters and examples, and `seg` as a synonym of its function

#### Scenario: An undocumented function
- **WHEN** a package registers `ply` with no documentation comment
- **THEN** the catalog lists `ply` as undocumented, with its package and file

### Requirement: Regeneration
One npm script SHALL rebuild the catalog. The output SHALL be stable: building twice with the same installed packages SHALL give identical files. Hand-written content SHALL live in a separate file and SHALL survive a rebuild.

#### Scenario: Rebuild with no update
- **WHEN** the catalog is rebuilt without updating Strudel
- **THEN** the committed files do not change

#### Scenario: Strudel updated
- **WHEN** Strudel is updated and the catalog is rebuilt
- **THEN** new functions appear, removed ones disappear, and the "useful for variety" notes stay on the functions that still exist

### Requirement: Coverage table
The catalog page SHALL show, for every function, whether the app's generated code writes it, found by compiling every built-in song, every live build in each profile and a fixed set of radio songs. It SHALL list the functions never written, and a column "useful for variety" filled by hand.

#### Scenario: A function the app writes
- **WHEN** the coverage is computed
- **THEN** `lpf` is marked as written, with the kinds of code that write it (songs, live builds, radio)

#### Scenario: A function never written
- **WHEN** the coverage is computed
- **THEN** `rib` is marked as never written and keeps its hand note in "useful for variety"

### Requirement: Generated code check
A check SHALL compile the same code as the coverage and SHALL fail when the code calls a function that is not in the catalog and not one of the app's own helpers. It SHALL also fail when the catalog was built from other package versions than those installed. It SHALL run in Node without a browser.

#### Scenario: Unknown function
- **WHEN** a code generator writes `.fooBar(2)`
- **THEN** the check fails and names `fooBar` and a song that writes it

#### Scenario: Outdated catalog
- **WHEN** Strudel is updated and the catalog is not rebuilt
- **THEN** the check fails and says to run the catalog script

### Requirement: Attribution
The committed catalog files SHALL state that the documentation comes from Strudel, with its version, its licence (AGPL-3.0-or-later) and a link to its project and authors.

#### Scenario: Header
- **WHEN** someone opens the Markdown catalog
- **THEN** its first lines name Strudel, the version read, the licence and the source

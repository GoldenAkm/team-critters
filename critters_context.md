Project Scope: AI-Powered Coastal Marine Species Identification & Conservation Awareness
Project Type: Hackathon Prototype
Data Source: Ocean Networks Canada (ONC)
Status: Research and Planning — Scope is evolving
1. Project Overview
We are developing an AI-powered application that identifies coastal marine fish and shellfish species using imagery and/or video data from Ocean Networks Canada (ONC).
Our goal is to combine artificial intelligence, marine biodiversity education, and gamification to create an engaging platform that raises public awareness about invasive and endangered marine species.
Beyond education, we envision expanding the platform into a tool that processes ONC observations into useful ecological information to support marine conservation and invasive-species management.
The hackathon prototype will focus on identifying one species, demonstrating an engaging educational experience, and communicating how the technology could eventually support larger-scale ecological monitoring.
2. Core Project Components
A. AI Species Identification
Develop an AI/ML system capable of identifying coastal marine species using ONC datasets.
Focus on one target species for the hackathon prototype.
Select this species based on ONC data availability, identification feasibility, and conservation relevance.
Prioritize coastal fish and shellfish, particularly invasive or endangered/threatened species.
Potential species of interest include European green crab, rockfish, and lingcod, but no species has been finalized.
The long-term goal is to support multiple species rather than just one.
Prioritize reliable identification rather than forcing predictions when visual evidence is insufficient.
Important constraint: We are using ONC data exclusively. We are not currently planning to collect identification photos or videos from users.
Current Data Situation
We have several potential sources of ONC data:
Hackathon Dataset: Manually annotated frames extracted from video supplied for the hackathon. The existing dataset is relatively poor in quality, so its suitability for training and evaluation needs investigation.
StarusGeo: A platform we understand can provide access to ONC imagery or geographic data. Its exact name, capabilities, and available datasets should be verified.
ONC SeaTube: A source of publicly accessible underwater video footage that may provide additional training and demonstration material.
Although we have access to data, we have not yet established which species has sufficient usable examples for a reliable prototype.
Identification Reliability Principle
Our proposed approach is conservative:
If the AI cannot identify a species with sufficient reliability, it should not include that prediction as a confirmed species observation.
For example, if an image is extremely blurry or the key visual features needed to identify a crab are hidden, the system should flag the observation rather than guess.
Potential output states include:
Identified: Sufficient evidence supports the identification.
Unknown / Uncertain: The system cannot reliably identify the species.
Needs Manual Review: The observation should be checked or annotated by a person.
The specific confidence thresholds and validation methods are not yet decided.
The long-term goal is to produce ecological observations that are useful and trustworthy, rather than simply maximizing the number of predictions.
B. Gamification and Public Education
We want to create an engaging experience loosely inspired by Pokémon GO, particularly its sense of discovery, collection, exploration, and progression.
Potential concepts include:
Discovering and collecting marine species in a digital collection.
Learning about species, habitats, ecological roles, and conservation status.
Educational challenges, achievements, and rewards.
Raising awareness of invasive-species threats and endangered-species conservation.
Exploring information associated with real species observations from ONC.
These are possibilities, not finalized features.
Species Information and Educational Content
Identified species would have associated educational content within the interface.
For example, a European green crab profile could describe:
What the species is and how to recognize it.
Why it is considered invasive in certain regions.
Its impact on local coastal ecosystems.
What organizations and researchers are doing to manage the invasion.
How monitoring and observational data can contribute to conservation efforts.
Equivalent educational content could focus on threats to endangered or vulnerable species.
The goal is to make real marine biodiversity data accessible, engaging, and understandable to the general public.
Unlike Pokémon GO, our application would work with ONC observations rather than requiring users to physically travel and photograph wildlife.
The exact gameplay loop, platform, and user experience have not yet been finalized.
C. Conservation and Invasive-Species Applications
Our broader vision is to transform species identification results into useful ecological information.
For example, if the AI identifies European green crabs within ONC footage, the system could eventually organize observations into information about:
Species presence and possible distribution.
Detection frequency across monitored locations.
Changes in observed activity over time.
Potential patterns relevant to invasive-species monitoring.
Such findings would depend on dataset coverage, sampling conditions, and model reliability.
ONC provides observational data, while conservation organizations, researchers, and relevant authorities can use ecological information to guide management decisions.
Our application would aim to help bridge that gap by interpreting, organizing, validating, and presenting observations in accessible formats.
Potential Conservation Data Workflow
Obtain imagery or video from ONC.
Process observations using the AI identification system.
Separate reliable detections from uncertain predictions.
Flag ambiguous observations for potential human review.
Organize validated observations alongside available metadata, such as timestamps and camera locations.
Eventually analyze and package this information for research or conservation applications.
This represents a potential long-term workflow rather than a commitment to implement every step during the hackathon.
We are not claiming that the prototype will directly prevent invasions, restore ecosystems, or independently establish species population trends.
3. Hackathon Prototype Scope
Due to limited development time, the prototype will demonstrate the core concept rather than implement the complete long-term vision.
Prototype priorities:
Select one species supported by usable ONC data.
Implement a working AI-based identification or detection workflow.
Demonstrate appropriate handling of uncertain predictions.
Present the identification results in an accessible interface.
Demonstrate at least a basic gamification or educational experience.
Explain how validated observations could eventually support conservation applications.
The exact implementation will depend on technical feasibility, dataset availability, and the team's development capacity.
Prototype Success Considerations
The team should aim to demonstrate:
A functional identification workflow using actual ONC imagery.
A model that can be meaningfully evaluated on held-out data.
Appropriate handling of uncertain identifications.
An interface connecting species identification to educational information.
A clear explanation of how the prototype could expand into a multi-species conservation platform.
We do not need to implement a complete ecological monitoring system, sophisticated game, or production-ready application during the hackathon.
4. Future Vision
After the hackathon, the platform could expand to include:
Multi-species detection and identification.
More extensive or automated analysis of ONC camera footage.
Detection records connected to available timestamps and locations.
Trends, visualizations, and ecological monitoring dashboards.
Human-reviewed identification workflows.
Exportable validated datasets or reports for conservation-related research.
Expanded gamification, education, and discovery features.
Improved monitoring capabilities for invasive or endangered species.
These are potential future directions, not required prototype deliverables.
5. Outstanding Research and Design Decisions
The team has not yet finalized the following:
Area
Decision Needed
Target Species
Which species has suitable ONC data and offers a compelling demonstration?
Dataset Quality
Are the available images and labels sufficient for meaningful model development?
Data Accessibility
How can we obtain and process additional usable ONC imagery and footage?
AI/ML
Which model, training strategy, or pretrained approach is most suitable?
Identification
Image classification, object detection, video-based identification, or another method?
Reliability
How should uncertain or low-quality observations be handled and validated?
Platform
Website, mobile app, or another approach?
UI/UX
How should users explore marine species and interact with identification results?
Gamification
Which game mechanics are practical and meaningful for the prototype?
Conservation Data
How should AI-generated observations be organized and presented?
Technical Architecture
Which tools, frameworks, and deployment approach are most practical?
Claude Code Skills
Would existing or custom Claude Skills meaningfully improve development?

These decisions should be researched and evaluated rather than assumed.
Research Area 1: ONC Data Availability, Quality & Species Selection
What we already know:
We have manually annotated frames from hackathon-provided video.
The supplied dataset is relatively poor in quality.
Additional imagery may be available through Starus Geo.
ONC SeaTube provides access to underwater video footage.
We will use ONC data exclusively for the prototype.
Research questions:
Which candidate coastal species are actually visible in accessible ONC imagery?
Which species has enough suitable examples for the prototype?
How many images of the target species are available, and what is their quality?
Are existing annotations reliable?
Could additional frames be extracted and annotated from SeaTube footage?
Do we have examples without the target species to distinguish detections from non-detections?
Are there visually similar species that could cause misidentification?
What timestamps, location information, or other metadata accompany the observations?
Are there restrictions on accessing, downloading, or reusing the data?
Expected research outcome: Recommend a target species based on actual ONC data availability, data quality, feasibility, and conservation relevance.
Research Area 2: AI Model Selection & End-to-End Technical Feasibility
Research questions:
Which model types best suit the project: image classifiers, object detectors, vision-language models, or another approach?
Which pretrained models could be adapted for underwater imagery?
Should we fine-tune an existing model, train a small classifier, use embeddings, or choose another approach?
Which methods are best suited to limited, noisy, or low-quality labeled data?
Can the model be trained or adapted with our available hardware and hackathon time?
What are the expected inference speeds and compute requirements?
How would the model integrate with the selected frontend and backend?
Should footage be processed into frames before inference?
Can the entire identification workflow be demonstrated reliably during the presentation?
Expected research outcome: Choose an AI approach and technical architecture that can realistically be developed, evaluated, integrated, and demonstrated during the hackathon.
Note: Research into full prototype feasibility, model integration, infrastructure, and deployment belongs in this area rather than a separate research category.
Research Area 3: Model Reliability, Confidence & Human Review
Guiding principle: An uncertain prediction should not be treated as a validated ecological observation.
Research questions:
How should identification confidence and reliability be evaluated?
Can confidence scores be calibrated against actual model performance?
What conditions should cause the model to return "Unknown"?
When should an observation be flagged for manual annotation or review?
How should we handle blurry images, poor lighting, occlusion, and missing identifying features?
How can we distinguish similar-looking species?
Which evaluation metrics are most relevant, such as precision, recall, and F1 score?
How should we test generalization using footage or observations not present in the training data?
How can we avoid introducing incorrect species detections into future conservation datasets?
Expected research outcome: Define a practical validation and uncertainty-handling approach that prioritizes reliable identifications and minimizes false positives.
Important distinction: A high model confidence score does not automatically mean the prediction is correct. Confidence thresholds should be supported by evaluation rather than assumed to indicate accuracy.
Research Area 4: UI/UX, Platform Selection & Gamification
Current direction:
A digital marine-species discovery experience inspired loosely by Pokémon GO.
A collection or discovery mechanic involving known marine species.
Educational species profiles explaining identification, conservation status, ecological importance, and related threats.
A connection between ONC observations and the species that users discover.
Research questions:
Should the prototype be a website, web app, or mobile application?
Which approach is easiest to implement and demonstrate within the hackathon?
What is the core user journey?
How should users interact with ONC footage and identification results?
How would users discover or collect species if they are not uploading their own observations?
Which game mechanics would make the experience engaging without requiring substantial development?
How should species profiles present scientific and conservation information?
How can identification, educational information, and gameplay feel like one coherent experience?
Expected research outcome: Determine the platform, interface direction, and core gameplay loop for the prototype.
Research Area 5: Claude Code Skills & AI-Assisted Development
We plan to use Claude Code for development and want to understand whether Claude Skills can meaningfully improve our workflow.
Research questions:
What are Claude Skills, and how do they function within Claude Code?
How do Skills differ from ordinary prompts, CLAUDE.md project instructions, and MCP integrations?
Are there existing Skills relevant to frontend development, AI/ML integration, testing, debugging, or project planning?
Could Skills help enforce consistent development practices across teammates?
Would creating custom Skills be worthwhile for this particular project?
How much setup and maintenance do Skills require?
Are there limitations or disadvantages to using Skills during a short hackathon?
Which Skills, if any, offer enough practical value to justify incorporating them?
Expected research outcome: Identify whether Claude Skills should be part of our implementation workflow and recommend only those with clear benefits.
We should avoid adding unnecessary tools or workflows simply because they are available.
Research Area 6: Conservation Data & Future Applications
Research questions:
What information should accompany each validated detection?
How should predictions, uncertain observations, and human-reviewed identifications be distinguished?
How could observations be organized by time, species, and location?
How might future versions aggregate sightings into useful ecological summaries?
What limitations arise from uneven camera coverage or unreliable identification?
What information would researchers or conservation organizations actually need from an identification system?
How could our results eventually support invasive-species monitoring or endangered-species conservation?
Expected research outcome: Develop a technically credible conservation-data vision that can be explained during the presentation without requiring full implementation during the hackathon.
Research Priorities
Priority
Research Area
Reason
P0
ONC Data & Species Selection
Determines which species can actually be identified
P0
AI Model & Technical Feasibility
Determines what can realistically be built
P0
Model Reliability & Validation
Establishes how trustworthy predictions will be
P1
UI/UX & Gamification
Defines the public-facing prototype experience
P1
Claude Code Skills
May improve development efficiency
P2
Conservation Data Applications
Supports the future vision and presentation

P0: Essential before committing to major implementation decisions.
P1: Important for product design and the development process.
P2: Primarily supports future expansion and communicating the project's broader impact.
These priorities indicate decision importance, not necessarily a strict order of execution. Some research can happen in parallel.
6. Project Boundaries and Important Clarifications
ONC-only data: The AI uses Ocean Networks Canada data, not crowdsourced observations.
Existing dataset limitations: We have manually annotated hackathon data, but its quality is poor and suitability is still being evaluated.
Additional data sources: Starus Geo and ONC SeaTube are potential sources for supplementary imagery and footage.
One-species prototype: Supporting additional species is a future expansion goal.
Conservation focus: Invasive and endangered/threatened species are the primary areas of interest, but the exact target species is undecided.
Gamification: Pokémon GO is inspiration, not a requirement to replicate its gameplay or GPS functionality.
Educational component: Species profiles should provide useful scientific and conservation-related information rather than simply displaying predictions.
Uncertainty handling: When identifying features are missing or predictions are unreliable, observations should be marked unknown or flagged for review rather than recorded as confirmed.
Scientific limitations: AI identification results may contain errors and require validation before being relied on for scientific or management decisions.
Not finalized: Species selection, user experience, machine learning approach, platform, and technical stack remain open.
Claude Code: Planned as a development tool, but use of additional Skills or integrations remains subject to research.
Hackathon feasibility: Prioritize a functional demonstration while communicating the broader conservation vision.
Long-term conservation value: The ultimate goal is to help transform ONC observations into information useful to conservation efforts, not directly perform conservation interventions.
7. Guidance for AI Assistants (ChatGPT / Claude / Claude Code)
This document provides shared project context.
When assisting the team:
Treat this as an evolving scope rather than a finalized product specification.
Do not assume the target species, model, platform, or architecture has already been selected.
Distinguish confirmed information from proposed ideas and assumptions.
Prioritize ONC dataset availability and practical hackathon feasibility.
Account for the poor quality of the existing manually annotated dataset.
Investigate additional ONC imagery and footage where relevant.
When researching species, verify whether ONC has relevant usable data.
Prioritize trustworthy identification over producing a prediction for every image.
Do not assume that model confidence alone establishes scientific validity.
Keep the educational/gamification component and conservation-data component conceptually distinct but connected.
Treat Claude Skills as an option to evaluate, not an automatic requirement.
Include technical feasibility when evaluating model approaches.
Avoid promising ecological impacts that a single-species prototype cannot demonstrate.
Help evaluate options and trade-offs before committing to an implementation.
Do not unnecessarily expand the project scope with features unrelated to the core prototype.
When Researching or Recommending Solutions
AI assistants should:
Clearly distinguish verified facts from assumptions.
Explain why an option fits the hackathon constraints.
Compare meaningful alternatives where appropriate.
Identify important limitations and implementation risks.
Prioritize evidence from actual ONC datasets when discussing species selection.
Avoid selecting technical solutions solely because they are popular or sophisticated.
Preserve the distinction between prototype deliverables and long-term ambitions.
Do not begin implementing the application solely based on this scope document. The team is still evaluating its research findings and will prepare a more specific implementation proposal for Claude Code once the major decisions are made.
8. One-Sentence Project Summary
We are building an AI-powered coastal marine species discovery platform that uses Ocean Networks Canada data to identify marine life, gamify biodiversity education, and lay the groundwork for data-driven invasive-species monitoring and marine conservation.

Current Project Stage: Refining scope, researching available data, evaluating technical approaches, investigating Claude Code Skills, and preparing a proposal for eventual implementation with Claude Code.
Addition 1 — Section 2.A: Current Data Situation
Add as the fourth data source:
4. ONC Digital Fishers: Digital Fishers is an ONC citizen-science platform where volunteers examine underwater video clips and annotate observations of marine life and other features.
It is relevant to our project in two ways:
Potential annotation resource: Existing human-generated observations may help us locate relevant footage or provide supplementary labels, subject to availability, reliability, and access restrictions.
Gamification reference: Digital Fishers demonstrates how ONC has already connected underwater observations, public participation, and scientific research through game-like interaction.
The platform primarily describes deep-sea video analysis, so we must investigate whether its existing observations include suitable coastal fish or shellfish species.
We should not assume its annotations are directly accessible, downloadable, or suitable for training without verification.
Addition 2 — Section 2.B: Gamification and Public Education
Add the following subsection:
Existing ONC Inspiration: Digital Fishers
ONC has already explored gamified marine observation through its Digital Fishers platform.
Our team should investigate its interaction design and how it motivates users to explore underwater footage and contribute to scientific understanding.
While Digital Fishers focuses on human annotation of video observations, our proposed application emphasizes AI-assisted species identification, marine species discovery, and conservation education.
We should investigate how our proposed experience could differ from and potentially complement Digital Fishers, rather than recreating its existing functionality.
Addition 3 — Section 5: Outstanding Research and Design Decisions
Research Area 1: ONC Data Availability, Quality & Species Selection
Add these questions:
Does Digital Fishers contain observations of our candidate coastal species?
Are Digital Fishers annotations accessible through ONC's annotation search tools or another supported method?
Could existing human-generated annotations help us find suitable training or evaluation footage?
How reliable and detailed are those annotations?
Research Area 4: UI/UX, Platform Selection & Gamification
Add these questions:
What gamification mechanics does Digital Fishers already use?
What lessons can we learn from its user experience?
How can our application offer a distinct experience centered on AI-generated identifications and species education?
Could the two approaches eventually complement one another?
Research Area 6: Conservation Data & Future Applications
Add this question:
How could AI-generated observations complement existing human-annotated observations from systems such as Digital Fishers?

Additional ONC Resource: Digital Fishers — Oceans 3.0
Research status: Identified as a relevant ONC project. Its suitability as a source of coastal species annotations and potential training data has not yet been established.




# Eros App Flow Chart

## Main Application Flow

```mermaid
flowchart TD
    Start([User Visits App]) --> Landing[Landing Page<br/>Features, How It Works]

    Landing --> Choice{User Action?}
    Choice -->|New User| SignUp[Sign Up Page]
    Choice -->|Existing User| Login[Login Page]

    SignUp --> CreateAccount[Create Account<br/>Email + Password]
    CreateAccount --> ProfileSetup[Profile Setup<br/>Name, Age, Pronouns, etc.]

    Login --> AuthCheck{Authenticated?}
    AuthCheck -->|No| Login
    AuthCheck -->|Yes| HasRelationship{Has Relationship?}

    ProfileSetup --> LinkPartner[Link Partner Page]
    HasRelationship -->|No| LinkPartner

    LinkPartner --> LinkChoice{Partner Status?}
    LinkChoice -->|Create New| GenerateCode[Generate Link Code<br/>Share with Partner]
    LinkChoice -->|Join Existing| EnterCode[Enter Partner's Code]

    GenerateCode --> WaitingState[Waiting for Partner<br/>to Join]
    EnterCode --> RelationshipSetup[Relationship Setup<br/>Duration, Goals, How We Met]

    RelationshipSetup --> BothLinked{Both Partners<br/>Linked?}
    WaitingState --> CheckPartner{Partner<br/>Joined?}
    CheckPartner -->|Not Yet| WaitingState
    CheckPartner -->|Yes| BothLinked

    BothLinked -->|Yes| Dashboard[Dashboard<br/>Relationship Overview]
    BothLinked -->|No| WaitingState
    HasRelationship -->|Yes, Active| Dashboard

    Dashboard --> MainFeatures{Choose Feature}

    MainFeatures -->|Chat| ChatPage[Conflict Chat<br/>3-Way Conversation]
    MainFeatures -->|MapQuest| LoveMaps[MapQuest for Couples<br/>Relationship Exercise]
    MainFeatures -->|Photos| PhotoGallery[Photo Gallery<br/>Upload & Manage Photos]
    MainFeatures -->|Profile| ProfilePage[Profile Management]
    MainFeatures -->|Dev Tools| DevTools[Dev Chat Simulator]

    ChatPage --> ChatFlow[Real-time Chat<br/>Partner A + Partner B + AI]
    ChatFlow --> AIMediation[AI Mediator Responds<br/>Emotionally Focused Therapy]
    AIMediation --> ChatFlow
    ChatFlow --> BackToDashboard1[Back to Dashboard]

    LoveMaps --> SelectMode{Select Mode}
    SelectMode -->|Discovery| DiscoveryMode[Discovery Mode<br/>Learn New Things]
    SelectMode -->|Growth| GrowthMode[Growth Mode<br/>Deepen Understanding]
    SelectMode -->|Intimacy| IntimacyMode[Intimacy Mode<br/>Vulnerable Topics]

    DiscoveryMode --> GameRounds[Question Rounds<br/>Guess → Answer → Reflect]
    GrowthMode --> GameRounds
    IntimacyMode --> GameRounds

    GameRounds --> RoundFlow{Round Flow}
    RoundFlow --> AwaitAnswer[Partner Answers<br/>Question Privately]
    AwaitAnswer --> AwaitGuess[Other Partner<br/>Guesses Answer]
    AwaitGuess --> Rating[Rate Guess<br/>Nailed It / Close / Partly Right / New Discovery]
    Rating --> Reflection[AI Facilitates<br/>Reflection Discussion]
    Reflection --> NextRound{Continue?}
    NextRound -->|Yes| GameRounds
    NextRound -->|No| SessionSummary[Session Summary<br/>AI Insights]
    SessionSummary --> BackToDashboard2[Back to Dashboard]

    PhotoGallery --> PhotoActions{Photo Action}
    PhotoActions -->|Upload| UploadPhoto[Upload Photo<br/>+ Caption]
    PhotoActions -->|Set Favorite| SetFavorite[Mark as Favorite<br/>Shows on Dashboard]
    PhotoActions -->|View| ViewPhotos[Browse Gallery]
    UploadPhoto --> PhotoGallery
    SetFavorite --> PhotoGallery
    ViewPhotos --> PhotoGallery
    PhotoGallery --> BackToDashboard3[Back to Dashboard]

    ProfilePage --> ViewProfile[View/Edit Profile<br/>Personal Info]
    ViewProfile --> BackToDashboard4[Back to Dashboard]

    DevTools --> DevSimulator[Dev Chat Simulator<br/>Test AI Mediator]
    DevSimulator --> CreateTestRel[Create Test Relationship<br/>Custom Personalities]
    CreateTestRel --> SimulateConvo[Simulate Conversation<br/>Auto-generate Messages]
    SimulateConvo --> BackToDashboard5[Back to Dashboard]

    BackToDashboard1 --> Dashboard
    BackToDashboard2 --> Dashboard
    BackToDashboard3 --> Dashboard
    BackToDashboard4 --> Dashboard
    BackToDashboard5 --> Dashboard

    Dashboard --> Logout[Logout]
    Logout --> Landing

    style Landing fill:#f9d5e5
    style Dashboard fill:#eeac99
    style ChatPage fill:#c7ceea
    style LoveMaps fill:#b5ead7
    style PhotoGallery fill:#ffdab9
    style DevTools fill:#e0e0e0
```

## Middleware Logic Flow

```mermaid
flowchart TD
    Request[Incoming Request] --> GetSession{Get User<br/>Session}

    GetSession --> CheckPath{Request Path?}

    CheckPath -->|Protected Path<br/>/dashboard, /profile,<br/>/conflicts, /link-partner| RequiresAuth{Has Session?}
    CheckPath -->|Auth Path<br/>/login, /signup| AlreadyAuth{Has Session?}
    CheckPath -->|Public Path| AllowAccess[Allow Access]

    RequiresAuth -->|No Session| RedirectLogin[Redirect to /login<br/>with redirectTo param]
    RequiresAuth -->|Has Session| AllowAccess

    AlreadyAuth -->|Has Session| RedirectDashboard[Redirect to /dashboard]
    AlreadyAuth -->|No Session| AllowAccess

    style RequiresAuth fill:#ffcccc
    style AlreadyAuth fill:#ccffcc
```

## Chat Real-time Flow

```mermaid
sequenceDiagram
    participant PartnerA as Partner A Browser
    participant PartnerB as Partner B Browser
    participant Supabase as Supabase Realtime
    participant API as Next.js API
    participant Claude as Claude AI (Opus 4)

    PartnerA->>API: Send message (POST /api/chat)
    API->>Supabase: Insert message (sender_type: partner_a)
    Supabase-->>PartnerA: Message stored
    Supabase-->>PartnerB: Realtime update (new message)

    API->>Claude: Generate AI mediation response
    Note over Claude: Emotionally Focused Therapy<br/>prompt with full conversation<br/>context + relationship details
    Claude-->>API: AI response
    API->>Supabase: Insert AI message (sender_type: ai)
    Supabase-->>PartnerA: Realtime update (AI message)
    Supabase-->>PartnerB: Realtime update (AI message)

    PartnerB->>API: Send message (POST /api/chat)
    API->>Supabase: Insert message (sender_type: partner_b)
    Supabase-->>PartnerA: Realtime update
    Supabase-->>PartnerB: Message stored

    API->>Claude: Generate AI response
    Claude-->>API: AI response
    API->>Supabase: Insert AI message
    Supabase-->>PartnerA: Realtime update (AI message)
    Supabase-->>PartnerB: Realtime update (AI message)
```

## MapQuest Game Flow

```mermaid
flowchart TD
    Start([Start MapQuest]) --> ChooseMode{Choose Mode}

    ChooseMode -->|Discovery| SetDepth1[Set Depth: Light]
    ChooseMode -->|Growth| SetDepth2[Set Depth: Medium]
    ChooseMode -->|Intimacy| SetDepth3[Set Depth: Deep]

    SetDepth1 --> CreateSession[Create Game Session<br/>Store mode + depth]
    SetDepth2 --> CreateSession
    SetDepth3 --> CreateSession

    CreateSession --> NewRound[Create New Round]
    NewRound --> SelectQuestion[AI Selects Random Question<br/>Based on mode + depth]
    SelectQuestion --> DetermineAnswerer[Determine Who Answers<br/>Alternates between partners]

    DetermineAnswerer --> AwaitingAnswer[State: AWAITING_ANSWER<br/>Question shown to answerer only]

    AwaitingAnswer --> AnswererResponds[Answerer Submits Answer<br/>Saved privately]
    AnswererResponds --> AwaitingGuess[State: AWAITING_GUESS<br/>Question + Answer shown to guesser]

    AwaitingGuess --> GuesserGuesses[Guesser Submits Guess]
    GuesserGuesses --> AwaitingRating[State: AWAITING_RATING<br/>Both see answer + guess]

    AwaitingRating --> AnswererRates{Answerer Rates Guess}
    AnswererRates -->|Nailed It| Award3Points[Award 3 points]
    AnswererRates -->|Pretty Close| Award2Points[Award 2 points]
    AnswererRates -->|Partly Right| Award1Point[Award 1 point]
    AnswererRates -->|New Discovery| Award2Discovery[Award 2 discovery points]

    Award3Points --> AwaitingReflection[State: AWAITING_REFLECTION]
    Award2Points --> AwaitingReflection
    Award1Point --> AwaitingReflection
    Award2Discovery --> AwaitingReflection

    AwaitingReflection --> AIGeneratesReflection[AI Generates Reflection Prompt<br/>Based on question + answers]
    AIGeneratesReflection --> ShowReflection[Show Reflection to Both]

    ShowReflection --> CompleteRound{Complete Round?}
    CompleteRound -->|More Rounds| NewRound
    CompleteRound -->|End Session| GenerateSummary[AI Generates Session Summary<br/>Insights + Patterns]

    GenerateSummary --> ShowSummary[Show Summary Page<br/>Points, Discoveries, Reflections]
    ShowSummary --> End([Return to Dashboard])

    style AwaitingAnswer fill:#ffffcc
    style AwaitingGuess fill:#ccffff
    style AwaitingRating fill:#ffccff
    style AwaitingReflection fill:#ccffcc
```

## Dev Simulation Testing Flow

```mermaid
flowchart TD
    Start([Dev Simulation Request]) --> LoadConfig[Load Scenario Config<br/>Personas, Hidden Truths, Topic]

    LoadConfig --> CreateTestRel[Create Test Relationship<br/>Generate 2 test users]
    CreateTestRel --> InitSimulation[Initialize Simulation<br/>Set turn count, scenario]

    InitSimulation --> TurnLoop{Turn Loop<br/>Iterate N times}

    TurnLoop --> DeterminePartner[Determine Next Speaker<br/>Alternates or based on AI prompt]
    DeterminePartner --> SimulatePartner[AI Simulates Partner Message<br/>Based on persona + behavioral rules]

    SimulatePartner --> SendMessage[Send Message to Chat<br/>Trigger AI mediator]
    SendMessage --> WaitForAI[Wait 8s for<br/>AI Mediator Response]

    WaitForAI --> CheckTurns{More Turns?}
    CheckTurns -->|Yes| TurnLoop
    CheckTurns -->|No| CollectTranscript[Collect Full Transcript<br/>All messages with timestamps]

    CollectTranscript --> EvalPhase[5-Agent Evaluation Phase]

    EvalPhase --> MediationJudge[Mediation Quality Judge<br/>13 categories, 1-5 scores]
    EvalPhase --> PartnerAJudge[Partner A Experience Judge<br/>Did A feel heard?]
    EvalPhase --> PartnerBJudge[Partner B Experience Judge<br/>Did B feel heard?]
    EvalPhase --> SafetyJudge[Safety Judge<br/>Pass/Fail - CRITICAL]
    EvalPhase --> MonetizationJudge[Monetization Judge<br/>Willingness to pay]

    MediationJudge --> CombineResults[Combine Evaluation Results]
    PartnerAJudge --> CombineResults
    PartnerBJudge --> CombineResults
    SafetyJudge --> CombineResults
    MonetizationJudge --> CombineResults

    CombineResults --> CalcMetrics[Calculate Metrics<br/>Message lengths, balance, etc.]
    CalcMetrics --> DeterminePass{Pass Status?}

    DeterminePass -->|Safety Fail| Fail[FAIL - Safety Issue]
    DeterminePass -->|Avg Score < 3.0| Fail
    DeterminePass -->|Avg Score >= 4.0| Pass[PASS]
    DeterminePass -->|Avg Score >= 3.0| WeakPass[WEAK PASS]

    Pass --> StoreResults[Store Comprehensive Results<br/>50+ metrics, failure tags, evaluations]
    WeakPass --> StoreResults
    Fail --> StoreResults

    StoreResults --> ReturnResponse[Return Simulation Results<br/>Pass status, scores, failure tags,<br/>most important improvement]

    ReturnResponse --> End([Simulation Complete])

    style SafetyJudge fill:#ffcccc
    style Fail fill:#ff9999
    style Pass fill:#99ff99
    style WeakPass fill:#ffffcc
```

## Database Schema Overview

```mermaid
erDiagram
    profiles ||--o{ relationships : "partner_a or partner_b"
    relationships ||--o{ relationship_messages : "has many"
    relationships ||--o{ love_map_sessions : "has many"
    relationships ||--o{ relationship_photos : "has many"
    love_map_sessions ||--o{ love_map_rounds : "has many"

    profiles {
        uuid id PK
        text email
        text full_name
        text preferred_name
        text avatar_url
        int age
        text pronouns
        text occupation
        text self_description
        text interests
        text personality
        text hidden_truth
        text enthusiasm_level
        text communication_style
    }

    relationships {
        uuid id PK
        uuid partner_a_id FK
        uuid partner_b_id FK
        text status
        text link_code
        int duration_months
        text relationship_description
        text relationship_goals
        text how_we_met
        text living_situation
        int message_count
    }

    relationship_messages {
        uuid id PK
        uuid relationship_id FK
        uuid sender_id FK
        text sender_type
        text content
        timestamptz created_at
    }

    love_map_sessions {
        uuid id PK
        uuid relationship_id FK
        text mode
        text depth
        int total_rounds
        int completed_rounds
        text status
        jsonb summary
    }

    love_map_rounds {
        uuid id PK
        uuid session_id FK
        int round_number
        uuid question_id
        uuid answerer_id
        uuid guesser_id
        text answer
        text guess
        text rating
        text reflection
        text status
        int points_awarded
    }

    relationship_photos {
        uuid id PK
        uuid relationship_id FK
        uuid uploaded_by FK
        text photo_url
        text caption
        boolean is_favorite
        timestamptz created_at
    }

    dev_simulation_runs {
        uuid id PK
        text scenario
        text scenario_category
        text severity
        jsonb transcript
        decimal mediation_quality_score
        text safety_score
        text pass_status
        text[] failure_tags
        jsonb mediation_evaluation
        jsonb safety_evaluation
        jsonb monetization_evaluation
    }
```

## Key Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| **Landing Page** | ✅ Live | Marketing page with features, how it works |
| **Authentication** | ✅ Live | Email/password signup and login via Supabase |
| **Profile Setup** | ✅ Live | Name, age, pronouns, occupation, interests |
| **Partner Linking** | ✅ Live | Generate/enter link code to connect partners |
| **Dashboard** | ✅ Live | Relationship overview, partner profiles, favorite photo |
| **Conflict Chat** | ✅ Live | 3-way real-time chat with AI mediator (EFT-based) |
| **MapQuest Game** | ✅ Live | Relationship exercise with 3 modes, 3 depths |
| **Photo Gallery** | ✅ Live | Upload, caption, favorite photos |
| **Dev Simulator** | ✅ Live | Test AI mediator with custom personalities |
| **Enhanced Testing** | ✅ Live | 5-agent evaluation system, 12 test scenarios |

## AI Integration Points

| Integration | Model | Purpose |
|-------------|-------|---------|
| **Conflict Mediator** | Claude Opus 4 | Emotionally Focused Therapy mediation in 3-way chat |
| **MapQuest Reflection** | Claude Opus 4 | Generate reflections after each round |
| **MapQuest Summary** | Claude Opus 4 | Session insights and pattern identification |
| **Partner Simulator** | Claude Opus 4 | Simulate realistic partner responses for testing |
| **Evaluation Judges** | Claude Opus 4 | 5 specialized judges for comprehensive evaluation |

## Current User Journey

1. **Landing** → Sign up → Create profile
2. **Link Partner** → Generate code OR enter partner's code
3. **Setup Relationship** → Duration, goals, how you met
4. **Wait for Partner** (if code creator) → Partner joins
5. **Dashboard** → See relationship overview
6. **Choose Feature:**
   - **Chat** → 3-way conversation with AI mediator
   - **MapQuest** → Guess-reveal-reflect game
   - **Photos** → Upload and manage couple photos
   - **Profile** → Edit personal information
7. **Return to Dashboard** → Access other features

## Notes

- All routes are protected by middleware (auth required)
- Real-time updates via Supabase Realtime subscriptions
- AI responses use full conversation context + relationship details
- Testing system evaluates safety (CRITICAL), quality, experience, and monetization
- All AI interactions use Claude Opus 4 for best quality

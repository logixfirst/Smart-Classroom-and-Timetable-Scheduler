from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from src.models import TimetableRequest, TimetableResponse
from src.timetable_generator import TimetableGenerator

app = FastAPI(title="SIH28 Timetable AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate-timetable", response_model=TimetableResponse)
async def generate_timetable(request: TimetableRequest):
    try:
        generator = TimetableGenerator(request)
        options = generator.generate_options()
        
        if not options:
            # Determine specific error reason
            total_classes = sum(s.classesPerWeek for s in request.subjects) * len(request.batches)
            total_slots = len(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) * request.maxClassesPerDay * len(request.classrooms)
            
            if total_classes > total_slots:
                error_msg = f"Insufficient capacity: Need {total_classes} slots but only {total_slots} available. Consider adding more classrooms or increasing max classes per day."
            elif len(request.faculty) == 0:
                error_msg = "No faculty members provided. Please add faculty to generate timetable."
            elif len(request.subjects) == 0:
                error_msg = "No subjects provided. Please add subjects to generate timetable."
            elif len(request.classrooms) == 0:
                error_msg = "No classrooms provided. Please add classrooms to generate timetable."
            else:
                error_msg = "Unable to generate timetable with current constraints. Try reducing classes per week or adding more resources."
            
            return TimetableResponse(
                success=False,
                options=[],
                error=error_msg
            )
        
        return TimetableResponse(
            success=True,
            options=options
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "timetable-ai"}
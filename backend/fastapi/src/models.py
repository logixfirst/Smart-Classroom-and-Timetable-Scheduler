from pydantic import BaseModel
from typing import List, Literal

class Classroom(BaseModel):
    id: str
    roomNumber: str
    capacity: int
    type: Literal['lecture', 'lab']

class Batch(BaseModel):
    id: str
    name: str
    strength: int

class Subject(BaseModel):
    id: str
    name: str
    code: str
    classesPerWeek: int

class Faculty(BaseModel):
    id: str
    name: str

class FixedSlot(BaseModel):
    id: str
    subject: str
    faculty: str
    day: str
    timeSlot: str

class TimetableRequest(BaseModel):
    department: str
    semester: str
    academicYear: str
    maxClassesPerDay: int
    classrooms: List[Classroom]
    batches: List[Batch]
    subjects: List[Subject]
    faculty: List[Faculty]
    fixedSlots: List[FixedSlot]

class TimeSlot(BaseModel):
    day: str
    time: str
    subject: str
    faculty: str
    classroom: str
    batch: str

class TimetableOption(BaseModel):
    id: int
    score: float
    schedule: List[TimeSlot]
    conflicts: List[str]

class TimetableResponse(BaseModel):
    success: bool
    options: List[TimetableOption]
    error: str = None
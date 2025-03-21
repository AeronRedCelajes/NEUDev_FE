import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute.jsx"; // Import fixed component
import LogoutListener from "./LogoutListener";

import { HomeComponents } from "./components/HomeComponent";
import { SignInComponent } from "./components/SignInComponent";
import { SignUpComponent } from "./components/SignUpComponent"; // New selection component
import { SignUpStudent } from "./components/SignUpStudent"; // Student-specific signup
import { SignUpTeacher } from "./components/SignUpTeacher"; // Teacher-specific signup
import NotFound from "./components/NotFound"; // ✅ Import the 404 NotFound component

// Student Components
import { StudentDashboardComponent } from "./components/student/StudentDashboardComponent";
import { StudentProfileComponent } from "./components/student/StudentProfileComponent";
import { StudentPlaygroundComponent } from "./components/student/StudentPlaygroundComponent.jsx";
import { StudentPlaygroundComponentTest } from "./components/student/StudentPlaygroundComponentTest.jsx";

import { StudentClassComponent } from "./components/student/StudentClassComponent.jsx";
import { StudentBulletinComponent } from "./components/student/StudentBulletinComponent.jsx";

import StudentActivityItemsComponent from "./components/student/StudentActivityItemsComponent.jsx";
import StudentActivityLeaderboardComponent from "./components/student/StudentActivityLeaderboardComponent.jsx";

import StudentCodingAssessmentComponent from "./components/student/StudentCodingAssessmentComponent.jsx";

// Teacher Components
import { TeacherDashboardComponent } from "./components/teacher/TeacherDashboardComponent";
import { TeacherDashboardArchivedComponent } from "./components/teacher/TeacherDashboardArchivedComponent";
import { TeacherProfileComponent } from "./components/teacher/TeacherProfileComponent";
import { TeacherPlaygroundComponent } from "./components/teacher/TeacherPlaygroundComponent.jsx";
import { TeacherPlaygroundComponentTest } from "./components/teacher/TeacherPlaygroundComponentTest.jsx";

import TeacherClassManagementClassRecordComponent from "./components/teacher/TeacherClassManagementClassRecordComponent.jsx";
import TeacherClassManagementClassParticipantsComponent from "./components/teacher/TeacherClassManagementClassParticipantsComponent.jsx";
import { TeacherClassManagementComponent } from "./components/teacher/TeacherClassManagementComponent.jsx";
import { TeacherClassManagementBulletinComponent } from "./components/teacher/TeacherClassManagementBulletinComponent.jsx";
import { TeacherCreateActivityComponent } from "./components/teacher/TeacherCreateActivityComponent.jsx";
import TeacherItemBankComponent from "./components/teacher/TeacherItemBankComponent.jsx";

import TeacherActivitySettingsComponent from "./components/teacher/TeacherActivitySettingsComponent.jsx";
import TeacherActivityItemsComponent from "./components/teacher/TeacherActivityItemsComponent.jsx";
import TeacherActivityLeaderboardComponent from "./components/teacher/TeacherActivityLeaderboardComponent.jsx";
import TeacherActivitySubmissionComponent from "./components/teacher/TeacherActivitySubmissionComponent.jsx";
import  TeacherCodingAssessmentComponent from "./components/teacher/TeacherCodingAssessmentComponent.jsx";

import  TeacherReviewComponent from "./components/teacher/TeacherReviewComponent.jsx";


function App() {
    return (
        <Router>
            <LogoutListener />
            <Routes>

                {/* Public Routes */}
                <Route path="/" element={<HomeComponents />} />
                <Route path="/home" element={<HomeComponents />} />
                <Route path="/signin" element={<SignInComponent />} />
                <Route path="/signup" element={<SignUpComponent />} />  {/* Role selection */}
                <Route path="/signup/student" element={<SignUpStudent />} /> {/* Student Signup */}
                <Route path="/signup/teacher" element={<SignUpTeacher />} /> {/* Teacher Signup */}

                {/* Protected Student Routes */}
                <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
                    <Route path="/student/dashboard" element={<StudentDashboardComponent />} />
                    <Route path="/student/profile" element={<StudentProfileComponent />} />
                    <Route path="/student/sandbox" element={<StudentPlaygroundComponent />} />
                    <Route path="/student/sandbox2" element={<StudentPlaygroundComponentTest />} />

                    <Route path="/student/class/:classID/activity" element={<StudentClassComponent />} />
                    <Route path="/student/class/:classID/student-bulletin" element={<StudentBulletinComponent />} />

                    <Route path="/student/class/:classID/activity/:actID/leaderboard" element={<StudentActivityLeaderboardComponent />} />
                    <Route path="/student/class/:classID/activity/:actID/items" element={<StudentActivityItemsComponent />} />

                    <Route path="/student/class/:classID/activity/:actID/assessment" element={<StudentCodingAssessmentComponent />} />
                </Route>

                {/* Protected Teacher Routes */}
                <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
                    <Route path="/teacher/dashboard" element={<TeacherDashboardComponent />} />
                    <Route path="/teacher/archived" element={<TeacherDashboardArchivedComponent />} />
                    <Route path="/teacher/profile" element={<TeacherProfileComponent />} />
                    <Route path="/teacher/sandbox" element={<TeacherPlaygroundComponent />} />
                    <Route path="/teacher/sandbox2" element={<TeacherPlaygroundComponentTest />} />

                    <Route path="/teacher/class/:classID/activity" element={<TeacherClassManagementComponent />} />
                    <Route path="/teacher/item" element={<TeacherItemBankComponent />} />
                    <Route path="/teacher/class/:classID/create-activity" element={<TeacherCreateActivityComponent />} />
                    <Route path="/teacher/class/:classID/classrecord" element={<TeacherClassManagementClassRecordComponent />} />
                    <Route path="/teacher/class/:classID/class-participants" element={<TeacherClassManagementClassParticipantsComponent />} />
                    <Route path="/teacher/class/:classID/teacher-bulletin" element={<TeacherClassManagementBulletinComponent />} />

                    {/* 🔥 Dynamic Activity Routes for Teachers */}
                    <Route path="/teacher/class/:classID/activity/:actID/leaderboard" element={<TeacherActivityLeaderboardComponent />} />
                    <Route path="/teacher/class/:classID/activity/:actID/items" element={<TeacherActivityItemsComponent />} />
                    <Route path="/teacher/class/:classID/activity/:actID/settings" element={<TeacherActivitySettingsComponent />} />
                    <Route path="/teacher/class/:classID/activity/:actID/submissions" element={<TeacherActivitySubmissionComponent />} />
                    <Route path="/teacher/class/:classID/activity/:actID/review" element={<TeacherReviewComponent />} />

                    <Route path="/teacher/class/:classID/activity/:actID/assessment" element={<TeacherCodingAssessmentComponent />} />
                </Route>

                {/* 🔥 Fallback route for 404 */}
                <Route path="*" element={<NotFound />} />

            </Routes>
        </Router>
    );
}

export default App;
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./src/models/Category');
const ReportReason = require('./src/models/ReportReason');

dotenv.config();

const DB_URI = process.env.DB_URI;

if (!DB_URI) {
  console.error("Please configure DB_URI in your .env file!");
  process.exit(1);
}

const initializeMasterData = async () => {
    try {
        await mongoose.connect(DB_URI);
        console.log("Connected to MongoDB");

        const masterData = [
            {
                name: "Wishes",
                subcategories: [
                    { name: "Birthday" },
                    { name: "Work Anniversary" },
                    { name: "Joining Anniversary" },
                    { name: "Promotion" },
                    { name: "Farewell" },
                    { name: "Welcome" },
                    { name: "New Role" },
                    { name: "Retirement" },
                    { name: "Festival" },
                    { name: "Success" },
                    { name: "Good Luck" },
                    { name: "Wedding" },
                    { name: "Engagement" },
                    { name: "Baby Arrival" },
                    { name: "New Beginning" }
                ]
            },
            {
                name: "Motivation",
                subcategories: [
                    { name: "Daily" },
                    { name: "Leadership" },
                    { name: "Career Growth" },
                    { name: "Success Mindset" },
                    { name: "Hard Work & Discipline" },
                    { name: "Team" },
                    { name: "Startup" },
                    { name: "Learning & Development" },
                    { name: "Productivity" },
                    { name: "Overcoming Challenges" },
                    { name: "Positive Thinking" },
                    { name: "Confidence Building" },
                    { name: "Monday" },
                    { name: "Goal Achievement" },
                    { name: "Innovation" }
                ]
            },
            {
                name: "Celebration",
                subcategories: [
                    { name: "Team Achievement" },
                    { name: "Project Completion" },
                    { name: "Award Recognition" },
                    { name: "Employee of the Month" },
                    { name: "Company Milestone" },
                    { name: "Promotion" },
                    { name: "Work Anniversary" },
                    { name: "Event" },
                    { name: "Festival" },
                    { name: "Sales Achievement" },
                    { name: "Product Launch" },
                    { name: "Partnership Announcement" },
                    { name: "Office Event" },
                    { name: "Success" },
                    { name: "Appreciation" }
                ]
            }
        ];

        console.log("Seeding Master Data (Categories)...");

        for (const data of masterData) {
            await Category.findOneAndUpdate(
                { name: data.name },
                { $set: data },
                { upsert: true, new: true, runValidators: true }
            );
        }

        console.log("Master data seeding completed successfully.");

        const reportReasons = [
            { name: "Inappropriate Behavior" },
            { name: "Asked for Personal Info" },
            { name: "Sexual Content" },
            { name: "Abusive Language" },
            { name: "Others" }
        ];

        console.log("Seeding Master Data (Report Reasons)...");

        for (const reason of reportReasons) {
            await ReportReason.findOneAndUpdate(
                { name: reason.name },
                { $set: reason },
                { upsert: true, new: true, runValidators: true }
            );
        }

        console.log("Report Reasons seeding completed successfully.");

    } catch (error) {
        console.error("Error seeding master data:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
        process.exit(0);
    }
}

initializeMasterData();

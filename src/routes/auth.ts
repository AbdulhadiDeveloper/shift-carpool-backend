import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = express.Router();

// Generate JWT function
const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;

    try {
        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            fullName,
            email,
            passwordHash,
            phone
        });

        res.status(201).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            token: generateToken(user._id.toString())
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check for user
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        // Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            token: generateToken(user._id.toString())
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

export default router;
import React from 'react'
import { Button, Form, Input, notification } from 'antd'
import { gql, useMutation } from '@apollo/client'
import { Link, useNavigate } from 'react-router-dom'

export default function RegistrationScreen() {

    const [register, {loading}] = useMutation(gql`
        mutation register($name: String!, $password: String!) {
            register(name: $name, password: $password) {
                name
            }
        }`
    )

    const navigateTo = useNavigate()

    const onSubmit = ({name, password}) => {
        register({variables: {name, password}})
        .then(() => {
            notification.open({
                message: 'Account created',
                description: 'You can now log in with your new account.',
                type: 'success',
                placement: 'bottomLeft'
            })
            navigateTo('/login')
        })
        .catch(error => notification.open({
            message: error.message,
            type: 'error',
            placement: 'bottomLeft'
        }))
    }

    return (
        <div className="custom" style={{
            minHeight: '100vh',
            background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)'
        }}>

            <div style={{padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <h1>Immoweb Keeper</h1>
                <img src="logo512.png" alt="Immoweb Keeper" style={{width: '150px'}} />
            </div>

            <div style={{display: 'flex', justifyContent: 'space-evenly'}}>
                <Form
                    onFinish={onSubmit}
                    size="large"
                    style={{backgroundColor: 'white', borderRadius: 15, margin: 30, padding: 30, width: 360}}
                >
                    <Form.Item
                        name="name"
                        rules={[{required: true, whitespace: true, message: 'Please input your username!'}]}
                    >
                        <Input placeholder="username" autoComplete="username" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            {required: true, message: 'Please input your password!'},
                            {min: 8, message: 'Password must contain at least 8 characters.'}
                        ]}
                    >
                        <Input.Password placeholder="password" autoComplete="new-password" />
                    </Form.Item>

                    <Form.Item
                        name="passwordConfirmation"
                        dependencies={['password']}
                        rules={[
                            {required: true, message: 'Please confirm your password!'},
                            ({getFieldValue}) => ({
                                validator(_, value) {
                                    if(!value || getFieldValue('password') === value) {
                                        return Promise.resolve()
                                    }
                                    return Promise.reject(new Error('The passwords do not match.'))
                                }
                            })
                        ]}
                    >
                        <Input.Password placeholder="confirm password" autoComplete="new-password" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" style={{width: '100%'}} loading={loading}>
                        Create account
                    </Button>

                    <div style={{marginTop: 12, textAlign: 'center'}}>
                        Already registered? <Link to="/login">Log in</Link>
                    </div>
                </Form>
            </div>
        </div>
    )
}

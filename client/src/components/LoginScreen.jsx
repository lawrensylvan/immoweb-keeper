import React from 'react'
import { Button, Form, Input, notification } from 'antd'
import { GithubOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { gql, useMutation } from '@apollo/client'

export default function LoginScreen({setToken}) {

    const [login, {loading}] = useMutation(gql`
        mutation login($name: String!, $password: String!) {
            login(name: $name, password: $password)
        }`
    )

    const navigateTo = useNavigate()
    const onSubmit = ({name, password}) => {
        login({variables: {name, password}})
        .then(data => {
            setToken(data.data.login)
            navigateTo('/explore/advanced-search')
        })
        .catch(error => notification.open({
            message: error.message,
            type: 'error',
            placement: 'bottomLeft'
        }))
    }

    return (
        <div className="custom" style={{
            height: '100vh',
            background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)',
        }}>

            <div style={{padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <h1>Immoweb Keeper</h1>
                <img src="logo512.png" alt="Immoweb Keeper" style={{width: '150px'}} />
            </div>

            <div style={{display: 'flex', justifyContent: 'space-evenly'}}>
                
                <Form onFinish={onSubmit}
                      size="large" style={{backgroundColor: 'white', borderRadius: 15, margin: 30, padding: 30}}>
                    
                    <Form.Item name="name" rules={[{required: true, message: 'Please input your username !' }]}>
                        <Input placeholder="username" type="text" />
                    </Form.Item>
                    
                    <Form.Item name="password" rules={[{required: true, message: 'Please input your password !' }]}>
                        <Input.Password placeholder="password" />
                    
                    </Form.Item>
                    
                    <Button htmlType="submit" style={{width: '100%'}} loading={loading}>Log in</Button>
                    <Link to="/register">Sign up</Link>

                </Form>

            </div>

            <div style={{display: 'flex', justifyContent: 'center'}}>
                <a href="https://github.com/lawrensylvan">
                    <GithubOutlined style={{fontSize: 28, color: 'black'}} />
                </a>
            </div>
            
        </div>

    )
}
